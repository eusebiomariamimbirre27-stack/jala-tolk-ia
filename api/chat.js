const MODEL = "gemini-3.7-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      reply: "",
      feedback: "GEMINI_API_KEY não está configurada no Vercel.",
      error_to_remember: ""
    });
  }

  try {
    const {
      message = "",
      level = "A1",
      mode = "conversation",
      history = []
    } = req.body || {};

    const systemInstruction = `
You are JALA Tolk IA, a friendly, patient and intelligent female English tutor.

The student's English level is ${level}.
Current mode: ${mode}.

Your job is to help the student speak English naturally.

Rules:
- Speak mainly in English.
- Adapt vocabulary and grammar to the student's level.
- Be encouraging and patient.
- If the student makes an important mistake, correct it briefly.
- Encourage the student to repeat the corrected sentence.
- Keep answers natural and not too long.

Return ONLY valid JSON with exactly these three fields:
reply
feedback
error_to_remember
`;

    const contents = [
      ...history.slice(-10).map(item => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: String(item.content || "") }]
      })),
      {
        role: "user",
        parts: [{ text: String(message) }]
      }
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents,
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      console.error("Gemini API error:", response.status, raw);

      return res.status(502).json({
        reply: "",
        feedback: `Gemini API error ${response.status}.`,
        error_to_remember: ""
      });
    }

    const data = JSON.parse(raw);

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "";

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      result = {
        reply: text,
        feedback: "",
        error_to_remember: ""
      };
    }

    return res.status(200).json({
      reply: result.reply || "",
      feedback: result.feedback || "",
      error_to_remember: result.error_to_remember || ""
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      reply: "",
      feedback: "The server could not connect to Gemini.",
      error_to_remember: ""
    });
  }
}
