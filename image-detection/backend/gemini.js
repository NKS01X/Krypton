const axios = require("axios");
const fs = require("fs");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// helper: convert image → base64
const imageToBase64 = (filePath) => {
    const image = fs.readFileSync(filePath);
    return image.toString("base64");
};

const analyzeImage = async (imagePath) => {
    try {
        // ✅ CHECK API KEY
        if (!GEMINI_API_KEY) {
            console.log("❌ Gemini API key missing");
            throw new Error("Missing Gemini API key");
        }

        console.log("🔑 Using API KEY:", GEMINI_API_KEY.substring(0, 10) + "...");

        const base64Image = imageToBase64(imagePath);

        // 🔥 NEW SMART PROMPT
        const prompt = `
Analyze this image and do the following:

1. Identify the main subject (player, team, or event)
2. Generate 5 short search queries

Return ONLY JSON in this format:

{
  "entity": "name of player or subject",
  "queries": ["query1", "query2", "query3", "query4", "query5"]
}

Rules:
- No explanation
- Queries must be short (max 5 words)
- Focus on sports/media content
- Focus on the main character in the image
- Analyse the timeline of the image

Example:
{
  "entity": "lionel messi",
  "queries": [
    "lionel messi hd",
    "messi argentina celebration",
    "football player close up",
    "soccer match action",
    "stadium player"
  ]
}
`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: "image/jpeg",
                                    data: base64Image
                                }
                            }
                        ]
                    }
                ]
            }
        );

        // ✅ extract response
        const text =
            response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        console.log("🧠 Gemini raw response:", text);

        // ✅ parse safely
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            console.log("⚠️ Failed to parse Gemini output, using fallback");

            return {
                entity: "unknown",
                queries: [
                    "football player",
                    "sports image",
                    "match highlight",
                    "stadium action",
                    "player close up"
                ]
            };
        }

        // ✅ safety checks
        return {
            entity: parsed.entity || "unknown",
            queries: parsed.queries || [
                "football player",
                "sports image",
                "match highlight",
                "stadium action",
                "player close up"
            ]
        };

    } catch (err) {
        console.error("❌ Gemini error:", err.response?.data || err.message);

        return {
            entity: "unknown",
            queries: [
                "football player",
                "sports image",
                "match highlight",
                "stadium action",
                "player close up"
            ]
        };
    }
};

module.exports = { analyzeImage };
