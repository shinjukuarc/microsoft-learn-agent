const { chromium } = require("playwright");

async function main() {
    const courseUrl = process.argv[2];

    if (!courseUrl) {
        console.log("Usage:");
        console.log('node index.js "COURSE_URL"');
        process.exit(1);
    }

    const browser = await chromium.launch({
        headless: false
    });

    const page = await browser.newPage();

    console.log("Opening course...");

    await page.goto(courseUrl, {
        waitUntil: "domcontentloaded"
    });

    console.log("Title:", await page.title());

    await page.waitForTimeout(5000);

    await browser.close();
}

main();