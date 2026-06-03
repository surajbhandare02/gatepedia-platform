const { openai } = require("../config/env");
const { HttpError } = require("../middleware/errorHandler");

/**
 * AI Provider Abstraction Layer
 * Currently routes to OpenAI, with stub architecture ready for Gemini integration.
 */
class AIProvider {
  constructor() {
    this.provider = process.env.AI_PROVIDER || "openai"; // Default to OpenAI
  }

  /**
   * Generates a response based on the prompt.
   * @param {string} prompt - The user prompt.
   * @param {Function} fallback - A callback that returns fallback data if API is disabled/fails.
   * @returns {string} - The AI's response text.
   */
  async generate(prompt, fallback) {
    if (this.provider === "openai") {
      return this._callOpenAI(prompt, fallback);
    } else if (this.provider === "gemini") {
      return this._callGemini(prompt, fallback);
    }
    return fallback();
  }

  async _callOpenAI(prompt, fallback) {
    if (!openai.apiKey || typeof fetch !== "function") return fallback();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openai.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Forced to GPT-4o-mini per spec
        messages: [{ role: "user", content: prompt }],
        temperature: 0.35,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("OpenAI Error:", body);
      throw new HttpError(502, `AI provider failed: ${body.slice(0, 180)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || fallback();
  }

  async _callGemini(prompt, fallback) {
    // Gemini implementation placeholder
    if (!process.env.GEMINI_API_KEY || typeof fetch !== "function") return fallback();

    // Example fetch to Google's API would go here
    return fallback(); // Returning fallback until actually implemented
  }
}

module.exports = new AIProvider();
