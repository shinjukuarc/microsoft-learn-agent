async function getModule(page) {
    return await page.evaluate(() => {

        const url = window.location.href;

        const title =
            document.querySelector("h1")?.textContent.trim() ||
            "Unknown Module";

        const links = [...document.querySelectorAll("a")];

        const lessons = [];
        const seen = new Set();

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

            // We want:
            // /training/modules/module-name/unit-name/
            if (parts.length !== moduleIndex + 3) {
                continue;
            }

            const lessonUrl = cleanUrl.endsWith("/")
                ? cleanUrl
                : cleanUrl + "/";

            // Get the unit number from the URL
            // Example:
            // /1-introduction/ → 1
            // /10-knowledge-check/ → 10
            const unitName = parts[moduleIndex + 2];

            const numberMatch = unitName.match(/^(\d+(?:-\d+)?)-/);

            if (!numberMatch) {
                continue;
            }

            const unitNumber = numberMatch[1];

            // Don't add the same unit twice
            if (seen.has(unitNumber)) {
                continue;
            }

            const lessonTitle =
                link.textContent
                    .replace(/\s+/g, " ")
                    .trim() ||
                unitName
                    .replace(/^\d+-/, "")
                    .replace(/-/g, " ");

            // Skip module assessments
            if (
                lessonTitle
                    .toLowerCase()
                    .includes("module assessment")
            ) {
                continue;
            }

            seen.add(unitNumber);

            lessons.push({
                number: unitNumber,
                title: lessonTitle,
                url: lessonUrl
            });
        }

        // Make sure lessons are in unit order
        lessons.sort((a, b) => {
            const aParts = a.number.split("-").map(Number);
            const bParts = b.number.split("-").map(Number);

            for (
                let i = 0;
                i < Math.max(aParts.length, bParts.length);
                i++
            ) {
                const diff =
                    (aParts[i] ?? 0) -
                    (bParts[i] ?? 0);

                if (diff !== 0) {
                    return diff;
                }
            }

            return 0;
        });

        // Renumber lessons after filtering
        lessons.forEach((lesson, index) => {
            lesson.number = index + 1;
        });

        return {
            title,
            url,
            lessons
        };
    });
}

module.exports = { getModule };