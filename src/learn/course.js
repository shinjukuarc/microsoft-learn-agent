async function getCourse(page) {
    return await page.evaluate(() => {

        const title =
            document.querySelector("h1")?.textContent.trim() ||
            "Unknown Course";

        const learningPaths = [];
        const seen = new Set();

        const links = [...document.querySelectorAll("a")];

        for (const link of links) {

            const href = link.href;

            // Learning paths inside the course syllabus
            if (!href.includes("/training/paths/")) {
                continue;
            }

            const cleanUrl = href.split("?")[0];

            if (seen.has(cleanUrl)) {
                continue;
            }

            const text = link.textContent
                .replace(/\s+/g, " ")
                .trim();

            if (!text) {
                continue;
            }

            seen.add(cleanUrl);

            learningPaths.push({
                title: text,
                url: cleanUrl.endsWith("/")
                    ? cleanUrl
                    : cleanUrl + "/"
            });
        }
        console.log("FOUND LEARNING PATHS:", learningPaths);
        return {
            title,
            learningPaths
        };
    });
}

module.exports = { getCourse };