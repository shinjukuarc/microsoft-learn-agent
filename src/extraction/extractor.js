async function extractLesson(page) {
    return await page.evaluate(() => {
        const main = document.querySelector("main");

        if (!main) {
            throw new Error("Could not find the main lesson content.");
        }

        const videoZone = main.querySelector(
            '#module-unit-content .zone[data-pivot="video"]'
        );

        const result = {
            title: "",
            duration: "",
            content: []
        };

        const elements = main.querySelectorAll(
            "h1, h2, h3, h4, p, ul, ol, table, img, iframe, pre, blockquote"
        );

        for (const element of elements) {
            if (videoZone && videoZone.contains(element)) {
                continue;
            }
            const text = element.textContent.trim();

            // -------------------------
            // STOP CONDITIONS
            // -------------------------

            if (
                text === "References" ||
                text.startsWith("References") ||
                text.startsWith("Next lesson") ||
                text.startsWith("Next unit") ||
                text.startsWith("Module incomplete:") ||
                (
                    text === "Get started with Azure" &&
                    [...element.parentElement.querySelectorAll("*")]
                        .some(child =>
                            child.textContent
                                .trim()
                                .includes(
                                    "Choose the Azure account that's right for you"
                                )
                        )
                )
            ) {
                break;
            }


            // -------------------------
            // IGNORE MICROSOFT UI
            // -------------------------

            if (
                element.closest("nav") ||
                element.closest("footer") ||
                element.closest("[class*='feedback']") ||
                element.closest("[class*='xp']") ||
                element.closest("[class*='progress']")
            ) {
                continue;
            }

            // -------------------------
            // TITLE
            // -------------------------

            if (element.tagName === "H1") {
                result.title = text;
                continue;
            }

            // -------------------------
            // DURATION
            // -------------------------

            if (
                (element.tagName === "UL" || element.tagName === "OL") &&
                element.children.length === 1 &&
                /^\d+\s+minutes?$/.test(text)
            ) {
                result.duration = text;
                continue;
            }

            // -------------------------
            // EMPTY ELEMENTS
            // -------------------------

            if (
                !text &&
                !["IMG", "IFRAME"].includes(element.tagName)
            ) {
                continue;
            }

            // -------------------------
            // CONTENT
            // -------------------------

            switch (element.tagName) {

                case "H2":
                case "H3":
                case "H4": {

                    const runs = [];

                    function extractHeadingRuns(node, formatting = {}) {

                        for (const child of node.childNodes) {

                            if (child.nodeType === Node.TEXT_NODE) {

                                if (child.textContent) {
                                    runs.push({
                                        type: "text",
                                        text: child.textContent,
                                        bold: formatting.bold || false,
                                        italics: formatting.italics || false
                                    });
                                }

                                continue;
                            }

                            if (child.nodeType !== Node.ELEMENT_NODE) {
                                continue;
                            }

                            // Link
                            if (child.tagName === "A") {

                                const linkText = child.textContent;
                                const href = child.href;

                                if (linkText && href) {
                                    runs.push({
                                        type: "link",
                                        text: linkText,
                                        href,
                                        bold: formatting.bold || false,
                                        italics: formatting.italics || false
                                    });
                                }

                                continue;
                            }

                            // Inline code
                            if (
                                child.tagName === "CODE" ||
                                child.tagName === "KBD"
                            ) {

                                const codeText = child.textContent;

                                if (codeText) {
                                    runs.push({
                                        type: "code",
                                        text: codeText
                                    });
                                }

                                continue;
                            }

                            const newFormatting = {
                                bold:
                                    formatting.bold ||
                                    child.tagName === "STRONG" ||
                                    child.tagName === "B",

                                italics:
                                    formatting.italics ||
                                    child.tagName === "EM" ||
                                    child.tagName === "I"
                            };

                            extractHeadingRuns(child, newFormatting);
                        }
                    }

                    extractHeadingRuns(element);

                    result.content.push({
                        type: "heading",
                        level: Number(element.tagName[1]),
                        text,
                        runs
                    });

                    break;
                }

                case "BLOCKQUOTE": {

                    const rawText = element.textContent.trim();

                    if (!rawText) {
                        break;
                    }

                    let type = "NOTE";

                    const firstLine = rawText.split("\n")[0].trim();

                    if (firstLine.includes("[!TIP]")) {
                        type = "TIP";
                    } else if (firstLine.includes("[!IMPORTANT]")) {
                        type = "IMPORTANT";
                    } else if (firstLine.includes("[!CAUTION]")) {
                        type = "CAUTION";
                    } else if (firstLine.includes("[!WARNING]")) {
                        type = "WARNING";
                    } else if (firstLine.includes("[!NOTE]")) {
                        type = "NOTE";
                    }

                    const runs = [];

                    function extractCalloutRuns(node, formatting = {}) {

                        for (const child of node.childNodes) {

                            if (child.nodeType === Node.TEXT_NODE) {

                                if (child.textContent) {
                                    runs.push({
                                        type: "text",
                                        text: child.textContent,
                                        bold: formatting.bold || false,
                                        italics: formatting.italics || false
                                    });
                                }

                                continue;
                            }

                            if (child.nodeType !== Node.ELEMENT_NODE) {
                                continue;
                            }

                            if (child.tagName === "A") {

                                const linkText = child.textContent;
                                const href = child.href;

                                if (linkText && href) {
                                    runs.push({
                                        type: "link",
                                        text: linkText,
                                        href,
                                        bold: formatting.bold || false,
                                        italics: formatting.italics || false
                                    });
                                }

                                continue;
                            }

                            if (
                                child.tagName === "CODE" ||
                                child.tagName === "KBD"
                            ) {

                                const codeText = child.textContent;

                                if (codeText) {
                                    runs.push({
                                        type: "code",
                                        text: codeText
                                    });
                                }

                                continue;
                            }

                            const newFormatting = {
                                bold:
                                    formatting.bold ||
                                    child.tagName === "STRONG" ||
                                    child.tagName === "B",

                                italics:
                                    formatting.italics ||
                                    child.tagName === "EM" ||
                                    child.tagName === "I"
                            };

                            extractCalloutRuns(child, newFormatting);
                        }
                    }

                    extractCalloutRuns(element);

                    result.content.push({
                        type: "callout",
                        calloutType: type,
                        text: rawText,
                        runs
                    });

                    break;
                }
                    
                case "P": {

                    const runs = [];

                    function extractRuns(node, formatting = {}) {

                        for (const child of node.childNodes) {

                            if (child.nodeType === Node.TEXT_NODE) {

                                if (child.textContent) {
                                    runs.push({
                                        type: "text",
                                        text: child.textContent,
                                        bold: formatting.bold || false,
                                        italics: formatting.italics || false
                                    });
                                }

                                continue;
                            }

                            if (child.nodeType !== Node.ELEMENT_NODE) {
                                continue;
                            }

                            if (child.tagName === "A") {

                                const linkText = child.textContent;
                                const href = child.href;

                                if (linkText && href) {
                                    runs.push({
                                        type: "link",
                                        text: linkText,
                                        href,
                                        bold: formatting.bold || false,
                                        italics: formatting.italics || false
                                    });
                                }

                                continue;
                            }

                            if (
                                child.tagName === "CODE" ||
                                child.tagName === "KBD"
                            ) {

                                const codeText = child.textContent;

                                if (codeText) {
                                    runs.push({
                                        type: "code",
                                        text: codeText
                                    });
                                }

                                continue;
                            }

                            const newFormatting = {
                                bold:
                                    formatting.bold ||
                                    child.tagName === "STRONG" ||
                                    child.tagName === "B",

                                italics:
                                    formatting.italics ||
                                    child.tagName === "EM" ||
                                    child.tagName === "I"
                            };

                            extractRuns(child, newFormatting);
                        }
                    }

                    extractRuns(element);

                    result.content.push({
                        type: "paragraph",
                        text,
                        runs
                    });

                    break;
                }

                case "UL":
                case "OL": {

                    const ordered = element.tagName === "OL";

                    const isChecklist =
                        element.closest("blockquote")?.className
                            ?.toString()
                            .toLowerCase()
                            .includes("checklist") ||
                        element.parentElement?.className
                            ?.toString()
                            .toLowerCase()
                            .includes("checklist");

                    const items = [];

                    function processList(list, level = 0) {

                        for (const li of list.querySelectorAll(":scope > li")) {

                            const runs = [];

                            function extractRuns(node, formatting = {}) {

                                for (const child of node.childNodes) {

                                    if (child.nodeType === Node.TEXT_NODE) {

                                        if (child.textContent) {
                                            runs.push({
                                                type: "text",
                                                text: child.textContent,
                                                bold: formatting.bold || false,
                                                italics: formatting.italics || false
                                            });
                                        }

                                        continue;
                                    }

                                    if (child.nodeType !== Node.ELEMENT_NODE) {
                                        continue;
                                    }

                                    if (child.tagName === "A") {

                                        const linkText = child.textContent;
                                        const href = child.href;

                                        if (linkText && href) {
                                            runs.push({
                                                type: "link",
                                                text: linkText,
                                                href,
                                                bold: formatting.bold || false,
                                                italics: formatting.italics || false
                                            });
                                        }

                                        continue;
                                    }

                                    const newFormatting = {
                                        bold:
                                            formatting.bold ||
                                            child.tagName === "STRONG" ||
                                            child.tagName === "B",

                                        italics:
                                            formatting.italics ||
                                            child.tagName === "EM" ||
                                            child.tagName === "I"
                                    };

                                    // Don't extract nested lists as part of this item's text
                                    if (
                                        child.tagName !== "UL" &&
                                        child.tagName !== "OL"
                                    ) {
                                        extractRuns(child, newFormatting);
                                    }
                                }
                            }

                            extractRuns(li);

                            items.push({
                                text: li.textContent.trim(),
                                runs,
                                level,
                                ordered: list.tagName === "OL"
                            });

                            // Process nested lists
                            for (const nestedList of li.querySelectorAll(
                                ":scope > ul, :scope > ol"
                            )) {
                                processList(nestedList, level + 1);
                            }
                        }
                    }

                    processList(element);

                    result.content.push({
                        type: isChecklist ? "checklist" : "list",
                        ordered,
                        items
                    });

                    break;
                }

                case "TABLE": {

                    const rows = [...element.querySelectorAll("tr")].map(row => ({

                        cells: [...row.querySelectorAll("th, td")].map(cell => {

                            const runs = [];

                            function extractRuns(node, formatting = {}) {

                                for (const child of node.childNodes) {

                                    if (child.nodeType === Node.TEXT_NODE) {

                                        if (child.textContent) {
                                            runs.push({
                                                type: "text",
                                                text: child.textContent,
                                                bold: formatting.bold || false,
                                                italics: formatting.italics || false
                                            });
                                        }

                                        continue;
                                    }

                                    if (child.nodeType !== Node.ELEMENT_NODE) {
                                        continue;
                                    }

                                    if (child.tagName === "A") {

                                        const linkText = child.textContent;
                                        const href = child.href;

                                        if (linkText && href) {
                                            runs.push({
                                                type: "link",
                                                text: linkText,
                                                href,
                                                bold: formatting.bold || false,
                                                italics: formatting.italics || false
                                            });
                                        }

                                        continue;
                                    }

                                    const newFormatting = {
                                        bold:
                                            formatting.bold ||
                                            child.tagName === "STRONG" ||
                                            child.tagName === "B",

                                        italics:
                                            formatting.italics ||
                                            child.tagName === "EM" ||
                                            child.tagName === "I"
                                    };

                                    extractRuns(child, newFormatting);
                                }
                            }

                            extractRuns(cell);

                            return {
                                text: cell.textContent.trim(),
                                header: cell.tagName === "TH",
                                runs
                            };
                        })

                    }));

                    result.content.push({
                        type: "table",
                        rows
                    });

                    break;
                }

                case "IMG":
                    result.content.push({
                        type: "image",
                        src: element.src,
                        alt: element.alt || "",
                        width: element.naturalWidth,
                        height: element.naturalHeight
                    });
                    break;

                case "IFRAME":
                    result.content.push({
                        type: "video",
                        src: element.src
                    });
                    break;

                case "PRE":
                    result.content.push({
                        type: "code",
                        text
                    });
                    break;
            }
        }

        return result;
    });
}

module.exports = { extractLesson };