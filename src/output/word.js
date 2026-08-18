const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    PageBreak,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    ExternalHyperlink,
    InternalHyperlink,
    Bookmark,
    ShadingType,
    Footer,
    PageNumber
} = require("docx");

const https = require("https");
const http = require("http");

function downloadImage(url) {
    return new Promise((resolve, reject) => {

        const client = url.startsWith("https")
            ? https
            : http;

        client.get(url, response => {

            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                return downloadImage(response.headers.location)
                    .then(resolve)
                    .catch(reject);
            }

            if (response.statusCode !== 200) {
                reject(
                    new Error(`Failed to download image: ${response.statusCode}`)
                );
                return;
            }

            const chunks = [];

            response.on("data", chunk => {
                chunks.push(chunk);
            });

            response.on("end", () => {
                resolve(Buffer.concat(chunks));
            });

            response.on("error", reject);

        }).on("error", reject);
    });
}

async function createModuleDocument(moduleNumber, moduleTitle, lessons, outputPath) {

    const children = [];

    // Module title
    children.push(
        new Paragraph({
            text: moduleNumber
                ? `${moduleNumber}. ${moduleTitle}`
                : moduleTitle,
            heading: HeadingLevel.TITLE,
            alignment: "center",
            spacing: {
                before: 3000,
                after: 300
            }
        })
    );

    children.push(
        new Paragraph({
            text: "Microsoft Learn",
            alignment: "center",
            spacing: {
                after: 3000
            }
        })
    );

    // Table of Contents
    children.push(
        new Paragraph({
            text: "Table of Contents",
            heading: HeadingLevel.HEADING_1
        })
    );

    for (const lesson of lessons) {

        const bookmarkId = `lesson-${lesson.number}`;

        children.push(
            new Paragraph({
                children: [
                    new InternalHyperlink({
                        children: [
                            new TextRun({
                                text: `${lesson.number}. ${lesson.title}`,
                                style: "Hyperlink"
                            })
                        ],
                        anchor: bookmarkId
                    })
                ],
                spacing: {
                    after: 100
                }
            })
        );
    }

    children.push(
        new Paragraph({
            children: [
                new PageBreak()
            ]
        })
    );


    let lessonStarted = false;

    for (let i = 0; i < lessons.length; i++) {

        const lesson = lessons[i];

        if (!lesson || !Array.isArray(lesson.content)) {
            console.log("Skipping invalid lesson:", lesson);
            continue;
        }

        if (lessonStarted) {
            children.push(
                new Paragraph({
                    children: [
                        new PageBreak()
                    ]
                })
            );
        }

        lessonStarted = true;

        // Lesson title
        children.push(
            new Paragraph({
                children: [
                    new Bookmark({
                        id: `lesson-${lesson.number}`,
                        children: [
                            new TextRun({
                                text: `${lesson.number}. ${lesson.title}`
                            })
                        ]
                    })
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: {
                    before: 200,
                    after: 300
                }
            })
        );

        if (lesson.duration) {

            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Duration: ${lesson.duration}`,
                            italics: true
                        })
                    ],
                    spacing: {
                        after: 250
                    }
                })
            );
        }

        // Lesson content
        for (const item of lesson.content) {

            if (item.type === "heading") {

                let headingLevel;

                if (item.level === 2) {
                    headingLevel = HeadingLevel.HEADING_2;
                } else if (item.level === 3) {
                    headingLevel = HeadingLevel.HEADING_3;
                } else {
                    headingLevel = HeadingLevel.HEADING_1;
                }

                const headingRuns = [];

                for (const run of item.runs || []) {

                    if (run.type === "text") {

                        headingRuns.push(
                            new TextRun({
                                text: run.text,
                                bold: run.bold || false,
                                italics: run.italics || false
                            })
                        );

                    } else if (run.type === "link") {

                        headingRuns.push(
                            new ExternalHyperlink({
                                children: [
                                    new TextRun({
                                        text: run.text,
                                        style: "Hyperlink",
                                        bold: run.bold || false,
                                        italics: run.italics || false
                                    })
                                ],
                                link: run.href
                            })
                        );

                    } else if (run.type === "code") {

                        headingRuns.push(
                            new TextRun({
                                text: run.text,
                                font: "Courier New",
                                shading: {
                                    type: ShadingType.CLEAR,
                                    fill: "EDEDED"
                                }
                            })
                        );
                    }
                }

                children.push(
                    new Paragraph({
                        children: headingRuns,
                        heading: headingLevel,
                        spacing: {
                            before: 250,
                            after: 150
                        }
                    })
                );

            } else if (item.type === "callout") {

                const colors = {
                    NOTE: "EAF2F8",
                    TIP: "E8F5E9",
                    IMPORTANT: "FFF8E1",
                    CAUTION: "FFF3E0",
                    WARNING: "FDECEC"
                };

                const labels = {
                    NOTE: "NOTE",
                    TIP: "TIP",
                    IMPORTANT: "IMPORTANT",
                    CAUTION: "CAUTION",
                    WARNING: "WARNING"
                };

                const calloutRuns = [];

                calloutRuns.push(
                    new TextRun({
                        text: `${labels[item.calloutType] || "NOTE"}: `,
                        bold: true
                    })
                );

                for (const run of item.runs || []) {

                    if (run.type === "text") {

                        calloutRuns.push(
                            new TextRun({
                                text: run.text,
                                bold: run.bold || false,
                                italics: run.italics || false
                            })
                        );

                    } else if (run.type === "link") {

                        calloutRuns.push(
                            new ExternalHyperlink({
                                children: [
                                    new TextRun({
                                        text: run.text,
                                        style: "Hyperlink",
                                        bold: run.bold || false,
                                        italics: run.italics || false
                                    })
                                ],
                                link: run.href
                            })
                        );

                    } else if (run.type === "code") {

                        calloutRuns.push(
                            new TextRun({
                                text: run.text,
                                font: "Courier New",
                                shading: {
                                    type: ShadingType.SOLID,
                                    fill: "EDEDED"
                                }
                            })
                        );
                    }
                }

                children.push(
                    new Paragraph({
                        children: calloutRuns,
                        shading: {
                            type: ShadingType.SOLID,
                            fill: colors[item.calloutType] || colors.NOTE
                        },
                        spacing: {
                            before: 200,
                            after: 200
                        }
                    })
                );

            } else if (item.type === "paragraph") {

                const paragraphRuns = [];

                for (const run of item.runs || []) {

                    if (run.type === "text") {

                        paragraphRuns.push(
                            new TextRun({
                                text: run.text,
                                bold: run.bold || false,
                                italics: run.italics || false
                            })
                        );

                        } else if (run.type === "code") {

                            paragraphRuns.push(
                                new TextRun({
                                    text: run.text,
                                    font: "Courier New",
                                    shading: {
                                        type: ShadingType.CLEAR,
                                        fill: "EDEDED"
                                    }
                                })
                            );

                    } else if (run.type === "link") {

                        paragraphRuns.push(
                            new ExternalHyperlink({
                                children: [
                                    new TextRun({
                                        text: run.text,
                                        style: "Hyperlink",
                                        bold: run.bold || false,
                                        italics: run.italics || false
                                    })
                                ],
                                link: run.href
                            })
                        );
                    }
                }

                children.push(
                    new Paragraph({
                        children: paragraphRuns,
                        spacing: {
                            after: 200,
                            line: 276
                        }
                    })
                );

            } else if (item.type === "checklist") {

                for (const listItem of item.items) {

                    const checklistRuns = [];

                    checklistRuns.push(
                        new TextRun({
                            text: "☐ ",
                            font: "Arial"
                        })
                    );

                    for (const run of listItem.runs || []) {

                        if (run.type === "text") {

                            checklistRuns.push(
                                new TextRun({
                                    text: run.text,
                                    bold: run.bold || false,
                                    italics: run.italics || false
                                })
                            );

                        } else if (run.type === "link") {

                            checklistRuns.push(
                                new ExternalHyperlink({
                                    children: [
                                        new TextRun({
                                            text: run.text,
                                            style: "Hyperlink",
                                            bold: run.bold || false,
                                            italics: run.italics || false
                                        })
                                    ],
                                    link: run.href
                                })
                            );

                        } else if (run.type === "code") {

                            checklistRuns.push(
                                new TextRun({
                                    text: run.text,
                                    font: "Courier New",
                                    shading: {
                                        type: ShadingType.CLEAR,
                                        fill: "EDEDED"
                                    }
                                })
                            );
                        }
                    }

                    children.push(
                        new Paragraph({
                            children: checklistRuns,
                            indent: {
                                left: 360
                            },
                            spacing: {
                                after: 100
                            }
                        })
                    );
                }    

            } else if (item.type === "list") {

                for (const listItem of item.items) {

                    const listRuns = [];

                    for (const run of listItem.runs || []) {

                        if (run.type === "text") {

                            listRuns.push(
                                new TextRun({
                                    text: run.text,
                                    bold: run.bold || false,
                                    italics: run.italics || false
                                })
                            );

                        } else if (run.type === "code") {

                            listRuns.push(
                                new TextRun({
                                    text: run.text,
                                    font: "Courier New",
                                    shading: {
                                        type: ShadingType.CLEAR,
                                        fill: "EDEDED"
                                    }
                                })
                            );

                        } else if (run.type === "link") {

                            listRuns.push(
                                new ExternalHyperlink({
                                    children: [
                                        new TextRun({
                                            text: run.text,
                                            style: "Hyperlink",
                                            bold: run.bold || false,
                                            italics: run.italics || false
                                        })
                                    ],
                                    link: run.href
                                })
                            );
                        }
                    }

                    if (listItem.ordered) {

                        children.push(
                            new Paragraph({
                                children: listRuns,
                                numbering: {
                                    reference: "lesson-numbered-list",
                                    level: listItem.level
                                }
                            })
                        );

                    } else {

                        children.push(
                            new Paragraph({
                                children: listRuns,
                                bullet: {
                                    level: listItem.level
                                }
                            })
                        );
                    }
                }

            } else if (item.type === "table") {

                const rows = item.rows.map((row, rowIndex) =>
                    new TableRow({
                        children: row.cells.map(cell => {

                            const cellRuns = [];

                            for (const run of cell.runs || []) {

                                if (run.type === "text") {

                                    cellRuns.push(
                                        new TextRun({
                                            text: run.text,
                                            bold: run.bold || false,
                                            italics: run.italics || false
                                        })
                                    );

                                } else if (run.type === "code") {

                                    listRuns.push(
                                        new TextRun({
                                            text: run.text,
                                            font: "Courier New",
                                            shading: {
                                                type: ShadingType.CLEAR,
                                                fill: "EDEDED"
                                            }
                                        })
                                    );

                                } else if (run.type === "link") {

                                    cellRuns.push(
                                        new ExternalHyperlink({
                                            children: [
                                                new TextRun({
                                                    text: run.text,
                                                    style: "Hyperlink",
                                                    bold: run.bold || false,
                                                    italics: run.italics || false
                                                })
                                            ],
                                            link: run.href
                                        })
                                    );
                                }
                            }

                            return new TableCell({
                                children: [
                                    new Paragraph({
                                        children: cellRuns
                                    })
                                ],
                                shading: rowIndex === 0
                                    ? {
                                        type: ShadingType.CLEAR,
                                        fill: "D9EAF7"
                                    }
                                    : undefined
                            });
                        })
                    })
                );

                children.push(
                    new Table({
                        rows,
                        width: {
                            size: 100,
                            type: "pct"
                        }
                    })
                );
            } else if (item.type === "code") {

                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: item.text,
                                font: "Courier New"
                            })
                        ],
                        shading: {
                            type: ShadingType.CLEAR,
                            fill: "F2F2F2"
                        },
                        indent: {
                            left: 240,
                            right: 240
                        },
                        spacing: {
                            before: 150,
                            after: 150,
                            line: 240
                        }
                    })
                );

            } else if (item.type === "image") {

                try {
                    const imageBuffer = await downloadImage(item.src);

                    const maxWidth = 600;
                    const maxHeight = 600;

                    let width = item.width || 500;
                    let height = item.height || 300;

                    const scale = Math.min(
                        maxWidth / width,
                        maxHeight / height,
                        1
                    );

                    width = Math.round(width * scale);
                    height = Math.round(height * scale);

                    children.push(
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: imageBuffer,
                                    transformation: {
                                        width,
                                        height
                                    }
                                })
                            ]
                        })
                    );

                } catch (error) {
                    console.log(`Could not download image: ${item.src}`);
                }
            }

            else if (item.type === "video") {

                children.push(
                    new Paragraph({
                        children: [
                            new ExternalHyperlink({
                                children: [
                                    new TextRun({
                                        text: "▶ Watch video",
                                        style: "Hyperlink"
                                    })
                                ],
                                link: item.src
                            })
                        ]
                    })
                );
            }
        }
    }

    const doc = new Document({

        numbering: {
            config: [
                {
                    reference: "lesson-numbered-list",
                    levels: [
                        {
                            level: 0,
                            format: "decimal",
                            text: "%1.",
                            alignment: "left"
                        },
                        {
                            level: 1,
                            format: "lowerRoman",
                            text: "%2.",
                            alignment: "left"
                        },
                        {
                            level: 2,
                            format: "lowerLetter",
                            text: "%3.",
                            alignment: "left"
                        }
                    ]
                }
            ]
        },
        sections: [
            {
                children,

                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: "center",
                                children: [
                                    new TextRun({
                                        children: [
                                            "Page ",
                                            PageNumber.CURRENT
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                }
            }
        ]
    });

    const buffer = await Packer.toBuffer(doc);

    const fs = require("fs");

    fs.writeFileSync(outputPath, buffer);

    console.log(`Created: ${outputPath}`);
}

module.exports = {
    createModuleDocument
};