const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.7-flash"
];

const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing in Vercel."
    });
  }

  const {
    message,
    level = "B1",
    mode = "conversation",
    history = [],
    errors = []
  } = req.body || {};

  if (!message) {
    return res.status(400).json({
      error: "Message is required."
    });
  }

  const systemInstruction = `
You are JALA Tolk IA, a friendly female English teacher and speaking coach.

Your job is to help the student improve English through natural conversation.

Student level: ${level}
Current mode: ${mode}

Rules:
- Speak mainly in English.
- Be friendly, patient and motivating.
- Keep responses concise and natural.
- Ask a useful follow-up question when appropriate.
- Correct important English mistakes.
- Use this correction format when necessary:

Correction:
You said: "..."
Better: "..."
Why: short explanation.

Then continue the conversation.

If the student makes a recurring mistake, mention it briefly.

Previous mistakes:
${errors.slice(-10).join("\n")}

Conversation history:
${history.slice(-8).map(x => `${x.role}: ${x.content || x.text || ""}`).join("\n")}
`;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: message }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500
    }
  };

  let lastError = null;

  for (const model of MODELS) {
    try {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 12000);

      const response = await fetch(
        `${API_URL}/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        }
      );

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        lastError = `Gemini ${model}: HTTP ${response.status}`;

        // Try the next model on temporary/server errors.
        if (
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500
        ) {
          continue;
        }

        return res.status(response.status).json({
          error: lastError
        });
      }

      const reply =
        data?.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("")
          .trim();

      if (!reply) {
        lastError = `Gemini ${model}: empty response`;
        continue;
      }

      return res.status(200).json({
        reply,
        feedback: "",
        error_to_remember: ""
      });

    } catch (error) {
      lastError =
        error.name === "AbortError"
          ? `Gemini ${model}: timeout`
          : `Gemini ${model}: ${error.message}`;

      continue;
    }
  }

  return res.status(503).json({
    error:
      "JALA Tolk temporarily could not reach Gemini. " +
      "The system tried multiple Gemini models."
  });
}
