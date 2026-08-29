const { getCourse } = require("./src/learn/course");
const { getLearningPath } = require("./src/learn/learningPath");
const { getModule } = require("./src/learn/modules");
const { chromium } = require("playwright");
const { processModule } = require("./src/processing/processModule");
const fs = require("fs");
const path = require("path");

function getUrlType(url) {
    const pathname = new URL(url).pathname;

    if (pathname.includes("/training/courses/")) {
        return "course";
    }

    if (pathname.includes("/training/paths/")) {
        return "learningPath";
    }

    if (pathname.includes("/training/modules/")) {
        return "module";
    }

    return "unknown";
}

const readline = require("readline");

async function getUrls() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("\nPaste Microsoft Learn URLs.");
    console.log("One URL per line.");
    console.log("Press Enter on an empty line when finished.\n");

    const urls = [];
    const seen = new Set();

    return new Promise((resolve) => {

        rl.on("line", (line) => {

            const url = line.trim();

            if (!url) {
                rl.close();
                return;
            }

            let normalizedUrl;

            try {
                const parsedUrl = new URL(url);

                // Remove query parameters and hash
                parsedUrl.search = "";
                parsedUrl.hash = "";

                // Always use a trailing slash
                parsedUrl.pathname =
                    parsedUrl.pathname.replace(/\/+$/, "") + "/";

                normalizedUrl = parsedUrl.toString();

            } catch {
                console.log(`Invalid URL: ${url}`);
                return;
            }

            if (seen.has(normalizedUrl)) {
                console.log(`Duplicate skipped: ${url}`);
                return;
            }

            seen.add(normalizedUrl);
            urls.push(normalizedUrl);
        });

        rl.on("close", () => {
            resolve(urls);
        });
    });
}

function getTranslationChoice() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(
            "\nTranslate extracted content to Arabic? (y/n): ",
            (answer) => {
                rl.close();

                resolve(
                    answer.trim().toLowerCase() === "y"
                );
            }
        );
    });
}

async function main() {

    const urls = await getUrls();

    if (urls.length === 0) {
        console.log("No URLs provided.");
        process.exit(1);
    }

    const translateToArabic =
        await getTranslationChoice();

    console.log(
        `\nTranslation: ${
            translateToArabic
                ? "Arabic"
                : "English"
        }`
    );

    console.log(`\n${urls.length} URL(s) detected.\n`);
    let completedUrls = 0;

    const outputDir = "./output";

    const coursesDir = path.join(outputDir, "courses");
    const learningPathsDir = path.join(outputDir, "learning-paths");
    const modulesDir = path.join(outputDir, "modules");

    for (const dir of [
        coursesDir,
        learningPathsDir,
        modulesDir
    ]) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    const browser = await chromium.launch({
        headless: false
    });

    try {
        const page = await browser.newPage();

        for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {

            const courseUrl = urls[urlIndex];
            const urlPosition = urlIndex + 1;

            let urlType;

            try {
                urlType = getUrlType(courseUrl);
            } catch {
                console.log(`Invalid URL: ${courseUrl}`);
                continue;
            }

            if (urlType === "unknown") {
                console.log(`Unsupported Microsoft Learn URL: ${courseUrl}`);
                continue;
            }

            console.log("\n======================================");
            console.log(`[${urlPosition}/${urls.length}] Processing`);
            console.log("Type:", urlType);
            console.log("URL:", courseUrl);
            console.log("======================================");

            console.log("Opening:", courseUrl);
                

            await page.goto(courseUrl, {
                waitUntil: "domcontentloaded"
            });

            await page.waitForSelector("main", {
                state: "visible"
            });

            if (urlType === "course") {
                try {
                    await page.waitForFunction(() => {
                        return document.querySelectorAll(
                            'a[href*="/training/paths/"]'
                        ).length > 0;
                    }, { timeout: 10000 });
                } catch {
                    console.log("No learning path links detected.");
                }
        }

        let course;
        let learningPaths;

        if (urlType === "course") {

            course = await getCourse(page);

            console.log(
                "Learning paths found:",
                course.learningPaths
            );

            console.log("\n========== COURSE ==========\n");
            console.log("Course:", course.title);

            learningPaths = course.learningPaths;

        } else if (urlType === "learningPath") {

            const learningPath = await getLearningPath(page);

            console.log("\n========== LEARNING PATH ==========\n");
            console.log("Learning Path:", learningPath.title);

            learningPaths = [
                {
                    title: learningPath.title,
                    url: courseUrl,
                    modules: learningPath.modules
                }
            ];

            course = {
                title: learningPath.title
            };

        } else if (urlType === "module") {

            const module = await getModule(page);

            console.log("\n========== MODULE ==========\n");
            console.log("Module:", module.title);

            learningPaths = [
                {
                    title: module.title,
                    url: courseUrl,
                    modules: [module]
                }
            ];

            course = {
                title: module.title
            };

        } else {
            throw new Error(
                "Unsupported Microsoft Learn URL."
            );
        }

        let courseOutputDir;

        if (urlType === "course") {

            courseOutputDir = path.join(
                coursesDir,
                course.title
            );

        } else if (urlType === "learningPath") {

            courseOutputDir = path.join(
                learningPathsDir,
                course.title
            );

        } else {

            courseOutputDir = modulesDir;
        }

        if (!fs.existsSync(courseOutputDir)) {
            fs.mkdirSync(courseOutputDir, {
                recursive: true
            });
        }

        // ==========================================
        // LEARNING PATHS
        // ==========================================

        for (
            let pathIndex = 0;
            pathIndex < learningPaths.length;
            pathIndex++
        ) {

            const pathInfo = learningPaths[pathIndex];
            const learningPathNumber = pathIndex + 1;

            console.log("\n========== LEARNING PATH ==========\n");
            console.log(
                "Opening learning path:",
                pathInfo.url
            );

            let learningPath;

            if (pathInfo.modules) {

                learningPath = pathInfo;

            } else {

                await page.goto(pathInfo.url, {
                    waitUntil: "domcontentloaded"
                });

                await page.waitForSelector("main", {
                    state: "visible"
                });

                learningPath = await getLearningPath(page);
            }

            console.log(
                "Learning Path:",
                learningPath.title
            );

            let learningPathOutputDir;

            if (urlType === "course") {

                learningPathOutputDir = path.join(
                    courseOutputDir,
                    `${learningPathNumber}-${learningPath.title}`
                );

            } else {

                learningPathOutputDir = courseOutputDir;
            }

            if (!fs.existsSync(learningPathOutputDir)) {
                fs.mkdirSync(learningPathOutputDir, {
                    recursive: true
                });
            }

            // ==========================================
            // MODULES
            // ==========================================

            for (
                let i = 0;
                i < learningPath.modules.length;
                i++
            ) {

                const moduleInfo = learningPath.modules[i];
                const moduleNumber = i + 1;

                console.log("\n========== MODULE ==========\n");
                console.log(
                    "Opening module:",
                    moduleInfo.url
                );

                await page.goto(moduleInfo.url, {
                    waitUntil: "domcontentloaded"
                });

                await page.waitForSelector("main", {
                    state: "visible"
                });

                const module = await getModule(page);

                const languageSuffix = translateToArabic
                    ? " - Arabic"
                    : " - English";
                let outputPath;

                if (urlType === "module") {

                    outputPath = path.join(
                        modulesDir,
                        `${module.title}${languageSuffix}.docx`
                    );

                } else {

                    outputPath = path.join(
                        learningPathOutputDir,
                        `${moduleNumber}-${module.title}${languageSuffix}.docx`
                    );
                }

                await processModule(
                    page,
                    module,
                    urlType === "module"
                        ? null
                        : moduleNumber,
                    outputPath,
                    translateToArabic
                );
            }
        }
        completedUrls++;

        console.log("\n======================================");
        console.log(
            `Completed ${completedUrls}/${urls.length} URL(s)`
        );
        console.log("======================================");
    }
    console.log("\n======================================");
    console.log("All URLs processed.");
    console.log(`Completed: ${completedUrls}/${urls.length}`);
    console.log("======================================");

} finally {

    console.log("\nClosing browser...");

    await browser.close();
}
}

main();