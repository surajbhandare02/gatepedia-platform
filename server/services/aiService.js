const pool = require("../db");
const { openai } = require("../config/env");
const intelligenceService = require("./intelligenceService");
const { HttpError } = require("../middleware/errorHandler");
const aiProvider = require("./aiProvider");

async function getTopic(topicId) {
  const result = await pool.query(
    `SELECT t.id, t.title, s.name AS subject
     FROM topics t
     JOIN subjects s ON s.id = t.subject_id
     WHERE t.id = $1`,
    [topicId]
  );
  if (result.rowCount === 0) throw new HttpError(404, "Topic not found");
  return result.rows[0];
}

async function explainTopic(userId, topicId) {
  const topic = await getTopic(topicId);
  const prompt = `Explain this GATE CSE topic for a learner.
Subject: ${topic.subject}
Topic: ${topic.title}
Give: intuition, core concepts, exam traps, and a 20-minute study plan.`;

  const explanation = await aiProvider.generate(prompt, () =>
    [
      `${topic.title} belongs to ${topic.subject}.`,
      "Start by writing definitions, then solve one solved example, then attempt two PYQs.",
      "Watch for formula misuse, edge cases, and terminology that sounds similar in GATE questions.",
    ].join("\n")
  );

  await pool.query(
    `INSERT INTO ai_insights (user_id, insight_type, title, body, metadata)
     VALUES ($1, 'topic_explanation', $2, $3, $4)`,
    [
      userId,
      `Explanation: ${topic.title}`,
      explanation,
      JSON.stringify({ topic_id: topic.id, subject: topic.subject }),
    ]
  );

  return { topic, explanation, provider: openai.apiKey ? "openai" : "local" };
}

async function generateQuiz(userId, topicId) {
  const topic = await getTopic(topicId);
  const prompt = `Generate 5 GATE CSE practice questions for ${topic.subject}: ${topic.title}.
Return concise questions with answer keys and difficulty labels.`;

  const quiz = await aiProvider.generate(prompt, () =>
    [
      {
        question: `What is the key idea tested in ${topic.title}?`,
        difficulty: "easy",
        answer: "State the definition, then apply it to a small example.",
      },
      {
        question: `Which edge case commonly appears in ${topic.title} PYQs?`,
        difficulty: "medium",
        answer: "Check boundary conditions and assumptions before calculation.",
      },
    ]
  );

  return { topic, quiz, provider: openai.apiKey ? "openai" : "local" };
}

async function generateFlashcards(userId, topicId) {
  const topic = await getTopic(topicId);
  const prompt = `Create 6 quick revision flashcards for GATE CSE topic ${topic.title} in ${topic.subject}.
Return front/back pairs.`;

  const cards = await aiProvider.generate(prompt, () => [
    { front: `Core definition of ${topic.title}`, back: "Write the formal definition and one example." },
    { front: "Common GATE trap", back: "Check assumptions before using a shortcut formula." },
    { front: "Revision drill", back: "Solve one PYQ and explain every option." },
  ]);

  if (Array.isArray(cards)) {
    for (const card of cards) {
      await pool.query(
        `INSERT INTO flashcards (user_id, topic_id, front, back, source)
         VALUES ($1, $2, $3, $4, 'ai')`,
        [userId, topic.id, card.front, card.back]
      );
    }
  }

  return { topic, flashcards: cards, provider: openai.apiKey ? "openai" : "local" };
}

async function recommendations(userId) {
  const planner = await intelligenceService.getPlanner(userId);
  const prompt = `Create personalized GATE CSE recommendations from this learner snapshot:
${JSON.stringify(planner).slice(0, 6000)}
Return priorities, revision advice, PYQ advice, and risk signals.`;

  const text = await aiProvider.generate(prompt, () =>
    planner.insights?.length
      ? planner.insights.map((item) => `${item.title}: ${item.body}`).join("\n")
      : "Complete more topics and PYQs to unlock richer recommendations."
  );

}

async function enhancePlanner(userId) {
  const basePlanner = await intelligenceService.getPlanner(userId);
  if (!openai.apiKey) return basePlanner;

  const prompt = `You are an AI study planner for a GATE CSE student.
Given their current algorithmic plan below, rewrite the "reason" for each "today_plan" item to be an encouraging, highly personalized 1-sentence AI suggestion. Keep everything else the same.
Current Plan:
${JSON.stringify(basePlanner.today_plan)}

Return ONLY a JSON array of objects with keys: order, topic_id, title, subject, minutes, reason.`;

  const aiText = await aiProvider.generate(prompt, () => null);
  if (aiText) {
    try {
      const cleaned = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
      const aiPlan = JSON.parse(cleaned);
      if (Array.isArray(aiPlan)) {
        basePlanner.today_plan = aiPlan;
        basePlanner.ai_enhanced = true;
      }
    } catch (e) {
      console.error("AI Planner parse error", e);
    }
  }
  return basePlanner;
}

async function enhancePerformance(userId) {
  const basePerf = await intelligenceService.getPerformanceInsights(userId);
  if (!openai.apiKey) return basePerf;

  const prompt = `You are a GATE prep AI. The student's current algorithmic readiness score is ${basePerf.readiness_score}/100.
Here are their weak subjects: ${JSON.stringify(basePerf.weak_subjects)}
Write a brief, 2-sentence AI assessment explaining their readiness score and what to focus on next. Return plain text.`;

  const aiText = await aiProvider.generate(prompt, () => null);
  if (aiText) {
    basePerf.insights.unshift({
      title: "AI Readiness Assessment",
      body: aiText,
      severity: "watch"
    });
    basePerf.ai_enhanced = true;
  }
  return basePerf;
}

async function enhancePyq(userId) {
  const basePyq = await intelligenceService.getPyqAnalyzer(userId);
  if (!openai.apiKey) return basePyq;

  const prompt = `You are a GATE PYQ AI Analyzer.
The student has weak topics: ${JSON.stringify(basePyq.weak_pyq_topics.slice(0, 3))}
Generate a brief 2-sentence trend prediction about which of these concepts is most likely to repeat in GATE, and why. Return plain text.`;

  const aiText = await aiProvider.generate(prompt, () => null);
  if (aiText) {
    basePyq.repeated_concepts.unshift({
      subject: "AI Trend Prediction",
      topic: "Predicted High-Yield Areas",
      signal: aiText
    });
    basePyq.ai_enhanced = true;
  }
  return basePyq;
}

async function summarizeNotes(userId, text) {
  const prompt = `Analyze the following GATE study notes and generate:
1. A concise summary (max 3 sentences).
2. 3 key flashcards (front/back).
3. 3 quick revision bullet points.

Notes:
${text.slice(0, 4000)}

Format the output as valid JSON with keys: "summary", "flashcards" (array of {front, back}), and "revisionPoints" (array of strings).`;

  const resultText = await aiProvider.generate(prompt, () => 
    JSON.stringify({
      summary: "This is a placeholder summary. AI processing failed or is disabled.",
      flashcards: [
        { front: "What is this topic about?", back: "The uploaded notes describe key concepts." }
      ],
      revisionPoints: [
        "Review the basic definitions.",
        "Check formulas and examples.",
        "Solve 2 PYQs related to this text."
      ]
    })
  );

  try {
    const cleaned = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleaned);
    
    // Save generated flashcards to db
    if (data.flashcards && Array.isArray(data.flashcards)) {
      for (const card of data.flashcards) {
        await pool.query(
          `INSERT INTO flashcards (user_id, topic_id, front, back, source)
           VALUES ($1, NULL, $2, $3, 'ai_notes')`,
          [userId, card.front, card.back]
        );
      }
    }

    return { ...data, provider: openai.apiKey ? "openai" : "local" };
  } catch (e) {
    return {
      summary: resultText,
      flashcards: [],
      revisionPoints: [],
      provider: openai.apiKey ? "openai" : "local",
      error: "Failed to parse JSON from AI response."
    };
  }
}

module.exports = {
  explainTopic,
  generateQuiz,
  generateFlashcards,
  recommendations,
  summarizeNotes,
  enhancePlanner,
  enhancePerformance,
  enhancePyq,
};
