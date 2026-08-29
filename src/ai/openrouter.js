require("dotenv").config();

async function translateWithOpenRouter(text) {

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 30000); // 30 seconds

    try {

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    model: "openrouter/free",

                    messages: [
                        {
                            role: "user",
                            content: text
                        }
                    ]
                }),

                signal: controller.signal
            }
        );

        if (!response.ok) {

            const errorText = await response.text();

            throw new Error(
                `OpenRouter failed (${response.status}): ${errorText}`
            );
        }

        const data = await response.json();

        return data.choices[0].message.content.trim();

    } catch (error) {

        if (error.name === "AbortError") {
            throw new Error(
                "OpenRouter timed out after 30 seconds"
            );
        }

        throw error;

    } finally {

        clearTimeout(timeout);
    }
}

module.exports = {
    translateWithOpenRouter
};