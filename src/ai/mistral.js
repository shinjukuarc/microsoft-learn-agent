require("dotenv").config();

async function translateWithMistral(text) {

    const response = await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
            method: "POST",

            headers: {
                "Authorization":
                    `Bearer ${process.env.MISTRAL_API_KEY}`,
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                model: "mistral-small-latest",

                messages: [
                    {
                        role: "user",
                        content: text
                    }
                ]
            })
        }
    );

    if (!response.ok) {

        const errorText = await response.text();

        throw new Error(
            `Mistral failed (${response.status}): ${errorText}`
        );
    }

    const data = await response.json();

    return data.choices[0].message.content.trim();
}

module.exports = {
    translateWithMistral
};