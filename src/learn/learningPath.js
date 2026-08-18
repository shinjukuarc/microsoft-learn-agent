async function getLearningPath(page) {
    return await page.evaluate(() => {

        const title =
            document.querySelector("h1")?.textContent.trim() ||
            "Unknown Learning Path";

        const modules = [];
        const seen = new Set();

        const links = [...document.querySelectorAll("a")];

        for (const link of links) {

            const href = link.href;

            if (!href.includes("/training/modules/")) {
                continue;
            }

            const cleanUrl = href.split("?")[0];

            const parts = new URL(cleanUrl).pathname
                .split("/")
                .filter(Boolean);

            const moduleIndex = parts.indexOf("modules");

            if (moduleIndex === -1) {
                continue;
            }

            // Only accept actual module URLs,
            // not lesson URLs.
            if (parts.length !== moduleIndex + 2) {
                continue;
            }

            const moduleUrl = cleanUrl.endsWith("/")
                ? cleanUrl
                : cleanUrl + "/";

            if (seen.has(moduleUrl)) {
                continue;
            }

            const text = link.textContent
                .replace(/\s+/g, " ")
                .trim();

            if (!text) {
                continue;
            }

            seen.add(moduleUrl);

            modules.push({
                title: text,
                url: moduleUrl
            });
        }

        return {
            title,
            modules
        };
    });
}

module.exports = { getLearningPath };