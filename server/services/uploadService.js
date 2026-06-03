const pdfParse = require("pdf-parse");
const pool = require("../db");
const { PREDEFINED_SYLLABUS } = require("./syllabusData");
const { HttpError } = require("../middleware/errorHandler");

function cleanLine(line) {
  return String(line || "")
    .replace(/[\u2022\u25cf\u25aa]/g, "-")
    .replace(/^\s*[-*]\s*/, "")
    .replace(/^\s*\d+[\).:-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function subjectForLine(line) {
  const lower = line.toLowerCase();
  return PREDEFINED_SYLLABUS.find((subject) =>
    subject.aliases.some((alias) => lower.includes(alias))
  );
}

function splitTopics(text) {
  return cleanLine(text)
    .split(/[,;|]/)
    .map(cleanLine)
    .filter((item) => item.length >= 3 && item.length <= 120);
}

function isTopicCandidate(line) {
  if (!line || line.length < 3 || line.length > 160) return false;
  const lower = line.toLowerCase();
  if (lower.includes("gate") && lower.includes("syllabus")) return false;
  if (/^(page|marks|section|subject)\b/i.test(line)) return false;
  return /[a-zA-Z]/.test(line);
}

function parseSyllabusText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const subjects = new Map();
  let current = null;

  for (const line of lines) {
    const matched = subjectForLine(line);
    if (matched && line.length <= 130) {
      current = matched;
      if (!subjects.has(matched.code)) {
        subjects.set(matched.code, {
          name: matched.name,
          code: matched.code,
          topics: new Set(),
        });
      }

      const afterColon = line.includes(":") ? line.split(":").slice(1).join(":") : "";
      splitTopics(afterColon).forEach((topic) =>
        subjects.get(matched.code).topics.add(topic)
      );
      continue;
    }

    if (current && isTopicCandidate(line)) {
      const target = subjects.get(current.code);
      splitTopics(line).forEach((topic) => {
        if (!subjectForLine(topic)) target.topics.add(topic);
      });
    }
  }

  const parsed = Array.from(subjects.values())
    .map((subject) => ({
      name: subject.name,
      code: subject.code,
      topics: Array.from(subject.topics).slice(0, 80),
    }))
    .filter((subject) => subject.topics.length > 0);

  if (parsed.length > 0) return parsed;

  const heuristic = [];
  let active = null;
  for (const line of lines) {
    const looksLikeHeading =
      line.endsWith(":") ||
      (/^[A-Z][A-Za-z\s&]+$/.test(line) && line.split(" ").length <= 5);
    if (looksLikeHeading) {
      active = { name: line.replace(/:$/, ""), topics: [] };
      heuristic.push(active);
      continue;
    }
    if (active && isTopicCandidate(line)) {
      splitTopics(line).forEach((topic) => active.topics.push(topic));
    }
  }

  return heuristic
    .filter((subject) => subject.topics.length > 0)
    .slice(0, 20)
    .map((subject, index) => ({
      name: subject.name,
      code: `UPLOAD-${index + 1}`,
      topics: Array.from(new Set(subject.topics)).slice(0, 80),
    }));
}

async function extractAndStorePdf(userId, file) {
  if (!file) throw new HttpError(400, "Upload a PDF file");
  if (file.mimetype !== "application/pdf") {
    throw new HttpError(400, "Only PDF uploads are supported");
  }

  const parsedPdf = await pdfParse(file.buffer);
  const text = parsedPdf.text || "";
  const parsedSubjects = parseSyllabusText(text);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upload = await client.query(
      `INSERT INTO uploads
         (user_id, filename, mime_type, file_size, extracted_text, parsed_subjects)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, filename, created_at`,
      [
        userId,
        file.originalname,
        file.mimetype,
        file.size,
        text,
        JSON.stringify(parsedSubjects),
      ]
    );

    const uploadId = upload.rows[0].id;
    for (let subjectIndex = 0; subjectIndex < parsedSubjects.length; subjectIndex += 1) {
      const subject = parsedSubjects[subjectIndex];
      const code = `UP-${userId}-${uploadId}-${slug(subject.name) || subjectIndex}`;
      const subjectRow = await client.query(
        `INSERT INTO subjects (user_id, name, code, display_order, source)
         VALUES ($1, $2, $3, $4, 'upload')
         ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name
         RETURNING id`,
        [userId, subject.name, code, 1000 + subjectIndex]
      );

      for (let topicIndex = 0; topicIndex < subject.topics.length; topicIndex += 1) {
        await client.query(
          `INSERT INTO topics (subject_id, title, display_order, source)
           VALUES ($1, $2, $3, 'upload')
           ON CONFLICT (subject_id, title) DO NOTHING`,
          [subjectRow.rows[0].id, subject.topics[topicIndex], topicIndex + 1]
        );
      }
    }

    await client.query("COMMIT");
    return {
      upload: upload.rows[0],
      parsed_subjects: parsedSubjects,
      extracted_characters: text.length,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function extractPdfText(file) {
  if (!file) throw new HttpError(400, "Upload a PDF file");
  if (file.mimetype !== "application/pdf") {
    throw new HttpError(400, "Only PDF uploads are supported");
  }

  const parsedPdf = await pdfParse(file.buffer);
  return { text: parsedPdf.text || "" };
}

module.exports = { extractAndStorePdf, parseSyllabusText, extractPdfText };
