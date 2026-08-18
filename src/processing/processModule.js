const fs = require("fs");
const path = require("path");

const { extractLesson } = require("../extraction/extractor");
const { createModuleDocument } = require("../output/word");

async function processModule(page, module, moduleNumber, outputPath) {

    const outputDir = path.dirname(outputPath);

    let progressPath;

    if (moduleNumber === null) {
        progressPath = path.join(
            outputDir,
            `.progress.json`
        );
    } else {
        progressPath = path.join(
            outputDir,
            `.${moduleNumber}-progress.json`
        );
    }

    let lessons = [];

    // Resume previous progress
    if (fs.existsSync(progressPath)) {
        try {
            lessons = JSON.parse(
                fs.readFileSync(progressPath, "utf8")
            );

            console.log(
                `Resuming module ${moduleNumber}: ${lessons.length} lessons already extracted.`
            );

        } catch (error) {

            console.log(
                "Could not read progress file. Starting fresh."
            );

            lessons = [];
        }
    }

    console.log("Module:", module.title);

    // Already completed
    if (fs.existsSync(outputPath)) {

        console.log(
            `Already completed: ${outputPath}`
        );

        console.log("Skipping module.");

        return;
    }

    // ==========================================
    // LESSONS
    // ==========================================

    for (const lessonInfo of module.lessons) {

        const alreadyExtracted = lessons.some(
            lesson =>
                lesson.number === lessonInfo.number
        );

        if (alreadyExtracted) {

            console.log(
                `Skipping lesson ${lessonInfo.number}: already extracted.`
            );

            continue;
        }

        console.log(
            "\n======================================"
        );

        console.log(
            "Opening lesson:",
            lessonInfo.url
        );

        console.log(
            "======================================"
        );

        const maxAttempts = 3;
        let lesson = null;

        for (
            let attempt = 1;
            attempt <= maxAttempts;
            attempt++
        ) {

            try {

                console.log(
                    `Attempt ${attempt}/${maxAttempts}`
                );

                await page.goto(lessonInfo.url, {
                    waitUntil: "domcontentloaded"
                });

                await page.waitForSelector("main", {
                    state: "visible"
                });

                // ==========================================
                // PREFER TEXT AND IMAGES
                // ==========================================

                const textImagesTab = page
                    .locator(
                        'form[data-bi-name="zone-pivots"] label'
                    )
                    .filter({
                        hasText: "Text and images"
                    });

                if (
                    await textImagesTab.count() > 0
                ) {

                    await textImagesTab
                        .first()
                        .click();

                    console.log(
                        "Selected: Text and images"
                    );

                    await page.locator(
                        '#module-unit-content .zone[data-pivot="text"]'
                    ).waitFor({
                        state: "visible"
                    });
                }

                // ==========================================
                // EXTRACT LESSON
                // ==========================================

                lesson = await extractLesson(page);

                if (!lesson) {
                    throw new Error(
                        "Lesson extraction returned nothing."
                    );
                }

                if (
                    !Array.isArray(lesson.content)
                ) {
                    throw new Error(
                        "Lesson content is invalid."
                    );
                }

                break;

            } catch (error) {

                console.log(
                    `Attempt ${attempt} failed: ${error.message}`
                );

                if (
                    attempt === maxAttempts
                ) {

                    console.log(
                        "\nLesson failed after 3 attempts."
                    );

                    console.log(
                        "Stopping the program so the lesson is not skipped."
                    );

                    throw error;
                }

                const retryDelay =
                    attempt * 2000 + 1000;

                console.log(
                    `Waiting ${retryDelay / 1000} seconds before retry...`
                );

                await page.waitForTimeout(
                    retryDelay
                );

                console.log(
                    "Retrying...\n"
                );
            }
        }

        lesson.number = lessonInfo.number;

        lessons.push(lesson);

        // ==========================================
        // SAVE PROGRESS
        // ==========================================

        fs.writeFileSync(
            progressPath,
            JSON.stringify(
                lessons,
                null,
                2
            )
        );

        console.log(
            `    [${lesson.number}/${module.lessons.length}] ✓ ${lesson.title}`
        );

        console.log(
            `  Duration: ${
                lesson.duration || "Unknown"
            }`
        );

        console.log(
            `  Content items: ${
                lesson.content.length
            }`
        );

        console.log(
            "  Progress saved"
        );
    }

    // ==========================================
    // CREATE WORD DOCUMENT
    // ==========================================

    await createModuleDocument(
        moduleNumber,
        module.title,
        lessons,
        outputPath
    );

    console.log(
        `✓ Module complete: ${module.title}`
    );

    // ==========================================
    // DELETE PROGRESS FILE
    // ==========================================

    if (fs.existsSync(progressPath)) {
        fs.unlinkSync(progressPath);
    }
}

module.exports = {
    processModule
};