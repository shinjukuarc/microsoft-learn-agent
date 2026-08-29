/*gemini file*/
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function translateWithGemini(text, jsonMode = false) {

    const prompt = `
Translate the following content from English into natural Modern Standard Arabic.

Rules:
- Preserve product names and brand names in English where appropriate.
- Preserve programming languages, framework names, API names, library names, and technical terms in English where appropriate.
- Never translate code, commands, URLs, file paths, function names, class names, variable names, or technical identifiers.
- Do not add explanations, notes, or extra content.
- Keep the original meaning and structure.

Content:
${text}
`;

    const config = {};

    if (jsonMode) {
        config.responseMimeType = "application/json";
    }

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
        config
    });

    return response.text.trim();
}

module.exports = {
    translateWithGemini
};