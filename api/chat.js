const MODEL = "gemini-3.8-flash";
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      reply: "",
      feedback: "GEMINI_API_KEY is not configured on Vercel.",
      error_to_remember: ""
    });
  }

  try {
    const {
      message = "",
      level = "B1",
      mode = "conversation",
      history = [],
      errors = []
    } = req.body || {};

    if (!message.trim()) {
      return res.status(400).json({
        reply: "",
        feedback: "Please send a message.",
        error_to_remember: ""
      });
    }

    const systemInstruction = `
You are JALA Tolk IA, a friendly, patient and intelligent female English tutor.

The student's English level is ${level}.
Current mode: ${mode}.

Your mission is to help the student become confident speaking English.

Rules:
- Speak mainly in English.
- Adapt your English to the student's level.
- Keep answers natural and reasonably short.
- Encourage the student to continue speaking.
- Correct important mistakes briefly.
- Give the correction when useful.
- Do not overwhelm the student with grammar explanations.

Return ONLY valid JSON with exactly:
reply
feedback
error_to_remember

Previous recurring errors:
${errors.slice(-12).join("\n")}
`;

    const contents = [
      ...history.slice(-8).map(item => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [
          {
            text: String(item.content || item.text || "")
          }
        ]
      })),
      {
        role: "user",
        parts: [
          {
            text: String(message)
          }
        ]
      }
    ];

    const requestBody = {
      systemInstruction: {
        parts: [
          {
            text: systemInstruction
          }
        ]
      },
      contents,
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    let response;
    let raw = "";

    // Retry transient Gemini errors such as 503.
    for (let attempt = 0; attempt < 4; attempt++) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify(requestBody)
        }
      );

      raw = await response.text();

      if (response.ok) {
        break;
      }

      // Retry 503, 429, 408 and other temporary 5xx errors.
      const temporary =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;

      if (!temporary || attempt === 3) {
        console.error(
          "Gemini API error:",
          response.status,
          raw
        );

        return res.status(response.status).json({
          reply: "",
          feedback:
            `Gemini API error ${response.status}. Please try again.`,
          error_to_remember: ""
        });
      }

      // 1s, 2s, 4s before retrying.
      await sleep(1000 * Math.pow(2, attempt));
    }

    let data;

    try {
      data = JSON.parse(raw);
    } catch (error) {
      console.error("Invalid Gemini response:", raw);

      return res.status(502).json({
        reply: "",
        feedback: "Gemini returned an invalid response.",
        error_to_remember: ""
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "";

    if (!text) {
      console.error("Empty Gemini response:", data);

      return res.status(502).json({
        reply: "",
        feedback: "Gemini returned an empty response.",
        error_to_remember: ""
      });
    }

    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      result = {
        reply: text,
        feedback: "",
        error_to_remember: ""
      };
    }

    return res.status(200).json({
      reply: result.reply || "",
      feedback: result.feedback || "",
      error_to_remember:
        result.error_to_remember || ""
    });

  } catch (error) {
    console.error("JALA Tolk server error:", error);

    return res.status(500).json({
      reply: "",
      feedback:
        "The JALA Tolk server encountered an unexpected error.",
      error_to_remember: ""
    });
  }
}
