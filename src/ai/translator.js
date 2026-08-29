const { translateWithGemini } = require("./gemini");
const { translateWithMistral } = require("./mistral");
const { translateWithOpenRouter } = require("./openrouter");

const providers = {
    Gemini: {
        translate: translateWithGemini,
        failures: 0,
        disabled: false
    },

    Mistral: {
        translate: translateWithMistral,
        failures: 0,
        disabled: false
    },

    OpenRouter: {
        translate: translateWithOpenRouter,
        failures: 0,
        disabled: false
    }
};

function collectRuns(runs, prefix, texts) {
    if (!Array.isArray(runs)) return;

    runs.forEach((run, runIndex) => {
        if (
            run.type === "text" &&
            run.text
        ) {
            texts.push({
                id: `${prefix}-run-${runIndex}`,
                text: run.text
            });
        }
    });
}

function collectTranslatableText(lesson) {
    const texts = [];

    texts.push({
        id: "lesson-title",
        text: lesson.title
    });

    lesson.content.forEach((item, itemIndex) => {

        // Never translate standalone code/images/videos
        if (
            item.type === "code" ||
            item.type === "image" ||
            item.type === "video"
        ) {
            return;
        }

        // Normal paragraphs, headings, callouts
        collectRuns(
            item.runs,
            `item-${itemIndex}`,
            texts
        );

        // Fallback for text without runs
        if (
            item.text &&
            !Array.isArray(item.runs)
        ) {
            texts.push({
                id: `item-${itemIndex}-text`,
                text: item.text
            });
        }

        // Lists and checklists
        if (Array.isArray(item.items)) {

            item.items.forEach((listItem, listIndex) => {

                collectRuns(
                    listItem.runs,
                    `item-${itemIndex}-list-${listIndex}`,
                    texts
                );

                if (
                    listItem.text &&
                    !Array.isArray(listItem.runs)
                ) {
                    texts.push({
                        id: `item-${itemIndex}-list-${listIndex}-text`,
                        text: listItem.text
                    });
                }
            });
        }

        // Tables
        if (Array.isArray(item.rows)) {

            item.rows.forEach((row, rowIndex) => {

                row.cells.forEach((cell, cellIndex) => {

                    collectRuns(
                        cell.runs,
                        `item-${itemIndex}-row-${rowIndex}-cell-${cellIndex}`,
                        texts
                    );

                    if (
                        cell.text &&
                        !Array.isArray(cell.runs)
                    ) {
                        texts.push({
                            id: `item-${itemIndex}-row-${rowIndex}-cell-${cellIndex}-text`,
                            text: cell.text
                        });
                    }
                });
            });
        }
    });

    return texts;
}

function createTranslationPrompt(texts) {
    return `
Translate the following content from English to natural Modern Standard Arabic.

Rules:
- Return ONLY valid JSON.
- Keep every id exactly unchanged.
- Translate only the value of "text".
- Translate the meaning of the COMPLETE content naturally, not word-by-word.
- Preserve the original meaning and logical relationships.
- Use natural Arabic grammar and sentence structure.
- Keep product names, brand names, company names, service names, and
  technology names written in English exactly as they are.
- NEVER translate or transliterate English product or brand names.
- For example, "Microsoft Learn" must remain exactly "Microsoft Learn".
- "Microsoft" must remain exactly "Microsoft".
- Keep programming languages, frameworks, libraries, APIs, commands,
  function names, class names, variable names, file paths, URLs, and
  technical identifiers in English when appropriate.
- Do not convert English technical terms into Arabic characters.
- Keep technical terms within the sentence where they logically belong.
- Do not group English terms together or move them unnecessarily.
- Never translate URLs, commands, file paths, function names, class names,
  variable names, or code.
- Do not add explanations or extra content.

Example:

English:
Microsoft Learn is a platform for learning Microsoft technologies.

Correct Arabic:
Microsoft Learn هي منصة لتعلم تقنيات Microsoft.

Incorrect:
ميكروسوفت ليرن هي منصة لتعلم تقنيات ميكروسوفت.

Incorrect:
منصة Microsoft Learn هي منصة لتعلم تقنيات مايكروسوفت.

Input:
${JSON.stringify(texts)}

Return:
[
    {
        "id": "original-id",
        "text": "Arabic translation"
    }
]
`;
}

function getTranslation(
    translationMap,
    id,
    originalText
) {
    return (
        translationMap.get(id) ||
        originalText
    );
}

function translateRuns(
    runs,
    prefix,
    translationMap
) {
    if (!Array.isArray(runs)) {
        return runs;
    }

    return runs.map((run, runIndex) => {

        if (
            run.type !== "text" ||
            !run.text
        ) {
            return run;
        }

        return {
            ...run,
            text: getTranslation(
                translationMap,
                `${prefix}-run-${runIndex}`,
                run.text
            )
        };
    });
}

function parseTranslationResponse(response) {

    let cleaned = response.trim();

    // Remove ```json at the beginning
    cleaned = cleaned.replace(/^```json\s*/i, "");

    // Remove ``` at the beginning if present
    cleaned = cleaned.replace(/^```\s*/i, "");

    // Remove ``` at the end
    cleaned = cleaned.replace(/\s*```$/i, "");

    return JSON.parse(cleaned);
}

async function translateWithFallback(texts) {

    const prompt = createTranslationPrompt(texts);

    const providerNames = [
        "Gemini",
        "Mistral",
        "OpenRouter"
    ];

    for (let i = 0; i < providerNames.length; i++) {

        const name = providerNames[i];
        const provider = providers[name];

        // Permanently disabled during this run
        if (provider.disabled) {
            continue;
        }

        try {

            console.log(`Using ${name} for translation...`);

            const response = await provider.translate(
                prompt,
                name === "Gemini"
            );

            const translations = parseTranslationResponse(response);

            console.log(`${name} translation successful.`);

            return translations;

        } catch (error) {

            provider.failures++;

            console.log(
                `${name} failed (${provider.failures} time(s)).`
            );

            console.log(`${name} error: ${error.message}`);

            /*
             * If this looks like a token/quota/limit problem,
             * disable this provider immediately.
             *
             * Otherwise, disable it after 2 failures.
             */
            const errorText = error.message.toLowerCase();

            const immediateSwitch =
                errorText.includes("token") ||
                errorText.includes("quota") ||
                errorText.includes("limit") ||
                errorText.includes("context length") ||
                errorText.includes("too many tokens");

            if (
                immediateSwitch ||
                provider.failures >= 2
            ) {

                provider.disabled = true;

                console.log(
                    `${name} is disabled for the rest of this run.`
                );
            }

            /*
             * If it has NOT been disabled, use the next provider
             * only for this current lesson.
             */
            if (!provider.disabled) {

                console.log(
                    `${name} failed once. Trying the next provider for this lesson...`
                );
            }
        }
    }

    throw new Error(
        "All translation providers failed."
    );
}

async function translateLesson(lesson) {

    console.log(
        `Translating lesson: ${lesson.title}`
    );

    const texts = collectTranslatableText(lesson);

    if (texts.length === 0) {
        return lesson;
    }

    const translations = await translateWithFallback(texts);

    const translationMap = new Map(
        translations.map((translation) => [
            translation.id,
            translation.text
        ])
    );

    return {
        ...lesson,

        title: getTranslation(
            translationMap,
            "lesson-title",
            lesson.title
        ),

        content: lesson.content.map(
            (item, itemIndex) => {

                if (
                    item.type === "code" ||
                    item.type === "image" ||
                    item.type === "video"
                ) {
                    return item;
                }

                const translatedItem = {
                    ...item
                };

                if (Array.isArray(item.runs)) {
                    translatedItem.runs = translateRuns(
                        item.runs,
                        `item-${itemIndex}`,
                        translationMap
                    );
                }

                if (
                    item.text &&
                    !Array.isArray(item.runs)
                ) {
                    translatedItem.text = getTranslation(
                        translationMap,
                        `item-${itemIndex}-text`,
                        item.text
                    );
                }

                if (Array.isArray(item.items)) {

                    translatedItem.items = item.items.map(
                        (listItem, listIndex) => {

                            const prefix =
                                `item-${itemIndex}-list-${listIndex}`;

                            const translatedListItem = {
                                ...listItem
                            };

                            if (
                                Array.isArray(listItem.runs)
                            ) {
                                translatedListItem.runs =
                                    translateRuns(
                                        listItem.runs,
                                        prefix,
                                        translationMap
                                    );
                            }

                            if (
                                listItem.text &&
                                !Array.isArray(listItem.runs)
                            ) {
                                translatedListItem.text =
                                    getTranslation(
                                        translationMap,
                                        `${prefix}-text`,
                                        listItem.text
                                    );
                            }

                            return translatedListItem;
                        }
                    );
                }

                if (Array.isArray(item.rows)) {

                    translatedItem.rows = item.rows.map(
                        (row, rowIndex) => ({
                            ...row,

                            cells: row.cells.map(
                                (cell, cellIndex) => {

                                    const prefix =
                                        `item-${itemIndex}-row-${rowIndex}-cell-${cellIndex}`;

                                    const translatedCell = {
                                        ...cell
                                    };

                                    if (
                                        Array.isArray(cell.runs)
                                    ) {
                                        translatedCell.runs =
                                            translateRuns(
                                                cell.runs,
                                                prefix,
                                                translationMap
                                            );
                                    }

                                    if (
                                        cell.text &&
                                        !Array.isArray(cell.runs)
                                    ) {
                                        translatedCell.text =
                                            getTranslation(
                                                translationMap,
                                                `${prefix}-text`,
                                                cell.text
                                            );
                                    }

                                    return translatedCell;
                                }
                            )
                        })
                    );
                }

                return translatedItem;
            }
        )
    };
}

module.exports = {
    translateLesson
};