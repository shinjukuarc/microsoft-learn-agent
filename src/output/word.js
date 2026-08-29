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
    PageNumber,
    AlignmentType,
    LevelFormat,
    LevelSuffix
} = require("docx");

const https = require("https");
const http = require("http");

function createTextRun(options, isArabic) {
    return new TextRun({
        ...options,
        rightToLeft: isArabic ? true : false,
        font: isArabic ? "Arial" : undefined
    });
}

function createParagraph(options, isArabic) {
    return new Paragraph({
        ...options,
        alignment: options.alignment ?? (
            isArabic
                ? AlignmentType.RIGHT
                : AlignmentType.LEFT
        ),
        bidirectional: options.bidirectional ?? false,
        run: options.run ?? (
            isArabic ? { rightToLeft: true } : undefined
        )
    });
}
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

async function createModuleDocument(
    moduleNumber,
    moduleTitle,
    lessons,
    outputPath,
    isArabic = false
) {
    console.log("isArabic inside createModuleDocument:", isArabic);

    const children = [];

    // Module title
    children.push(
        createParagraph({
            children: [
                createTextRun({
                    text: moduleNumber
                        ? `${moduleNumber}. ${moduleTitle}`
                        : moduleTitle
                }, isArabic)
            ],
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            spacing: {
                before: 3000,
                after: 300
            }
        }, isArabic)
    );

    children.push(
        createParagraph({
            children: [
                createTextRun({
                    text: "Microsoft Learn"
                }, isArabic)
            ],
            spacing: {
                after: 3000
            }
        }, isArabic)
    );

    // Table of Contents
    children.push(
        createParagraph({
            children: [
                createTextRun({
                    text: isArabic
                        ? "جدول المحتويات"
                        : "Table of Contents"
                }, isArabic)
            ],
            heading: HeadingLevel.HEADING_1,
        }, isArabic)
    );

    for (const lesson of lessons) {

        const bookmarkId = `lesson-${lesson.number}`;

        children.push(
            createParagraph({
                children: [
                    new InternalHyperlink({
                        children: [
                            createTextRun({
                                text: `${lesson.number}. ${lesson.title}`,
                                style: "Hyperlink"
                            }, isArabic)
                        ],
                        anchor: bookmarkId
                    })
                ],


                spacing: {
                    after: 100
                }
            }, isArabic)
        );
    }

    children.push(
        createParagraph({
            children: [
                new PageBreak()
            ]
        }, isArabic)
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
                createParagraph({
                    children: [
                        new PageBreak()
                    ]
                }, isArabic)
            );
        }

        lessonStarted = true;

        // Lesson title
        children.push(
            createParagraph({
                children: [
                    new Bookmark({
                        id: `lesson-${lesson.number}`,
                        children: [
                            createTextRun({
                                text: `${lesson.number}. ${lesson.title}`
                            }, isArabic)
                        ]
                    })
                ],
                heading: HeadingLevel.HEADING_1,


                spacing: {
                    before: 200,
                    after: 300
                }
            }, isArabic)
        );

        if (lesson.duration) {

            children.push(
                createParagraph({
                    children: [
                        createTextRun({
                            text: isArabic
                                ? `المدة: ${lesson.duration}`
                                : `Duration: ${lesson.duration}`,
                            italics: true
                        }, isArabic)
                    ],
    
    
                    spacing: {
                        after: 250
                    }
                }, isArabic)
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
                            createTextRun({
                                text: run.text,
                                bold: run.bold || false,
                                italics: run.italics || false
                            }, isArabic)
                        );

                    } else if (run.type === "link") {

                        headingRuns.push(
                            new ExternalHyperlink({
                                children: [
                                    createTextRun({
                                        text: run.text,
                                        style: "Hyperlink",
                                        bold: run.bold || false,
                                        italics: run.italics || false
                                    }, isArabic)
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
                    createParagraph({
                        children: headingRuns,
                        heading: headingLevel,
        
        
                        spacing: {
                            before: 250,
                            after: 150
                        }
                    }, isArabic)
                );

            } else if (item.type === "callout") {

                const colors = {
                    NOTE: "EAF2F8",
                    TIP: "E8F5E9",
                    IMPORTANT: "FFF8E1",
                    CAUTION: "FFF3E0",
                    WARNING: "FDECEC"
                };

                const labels = isArabic
                ? {
                    NOTE: "ملاحظة",
                    TIP: "نصيحة",
                    IMPORTANT: "هام",
                    CAUTION: "تنبيه",
                    WARNING: "تحذير"
                }
                : {
                    NOTE: "NOTE",
                    TIP: "TIP",
                    IMPORTANT: "IMPORTANT",
                    CAUTION: "CAUTION",
                    WARNING: "WARNING"
                };

                const calloutRuns = [];

                calloutRuns.push(
                    createTextRun({
                        text: `${labels[item.calloutType] || "NOTE"}: `,
                        bold: true
                    }, isArabic)
                );

                for (const run of item.runs || []) {

                    if (run.type === "text") {

                        calloutRuns.push(
                            createTextRun({
                                text: run.text,
                                bold: run.bold || false,
                                italics: run.italics || false
                            }, isArabic)
                        );
                    } else if (run.type === "link") {

                        calloutRuns.push(
                            new ExternalHyperlink({
                                children: [
                                    createTextRun({
                                        text: run.text,
                                        bold: run.bold || false,
                                        italics: run.italics || false
                                    }, isArabic)
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
                    createParagraph({
                        children: calloutRuns,
        
        
                        shading: {
                            type: ShadingType.SOLID,
                            fill: colors[item.calloutType] || colors.NOTE
                        },
                        spacing: {
                            before: 200,
                            after: 200
                        }
                    }, isArabic)
                );

            } else if (item.type === "paragraph") {

                const paragraphRuns = [];

                for (const run of item.runs || []) {

                    if (run.type === "text") {

                        paragraphRuns.push(
                            createTextRun({
                                text: run.text,
                                bold: run.bold || false,
                                italics: run.italics || false
                            }, isArabic)
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
                                    createTextRun({
                                        text: run.text,
                                        style: "Hyperlink",
                                        bold: run.bold || false,
                                        italics: run.italics || false
                                    }, isArabic)
                                ],
                                link: run.href
                            })
                        );
                    }
                }

                children.push(
                    createParagraph({
                        children: paragraphRuns,
        
        
                        spacing: {
                            after: 200,
                            line: 276
                        }
                    }, isArabic)
                );

            } else if (item.type === "checklist") {

                for (const listItem of item.items) {

                    const checklistRuns = [];

                    checklistRuns.push(
                        createTextRun({
                            text: "☐ ",
                            font: "Arial"
                        }, isArabic)
                    );

                    for (const run of listItem.runs || []) {

                        if (run.type === "text") {

                            checklistRuns.push(
                                createTextRun({
                                    text: run.text,
                                    bold: run.bold || false,
                                    italics: run.italics || false
                                }, isArabic)
                            );

                        } else if (run.type === "link") {

                            checklistRuns.push(
                                new ExternalHyperlink({
                                    children: [
                                        createTextRun({
                                            text: run.text,
                                            style: "Hyperlink",
                                            bold: run.bold || false,
                                            italics: run.italics || false
                                        }, isArabic)
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
                        createParagraph({
                            children: checklistRuns,
            
            
                            indent: isArabic
                                ? { right: 360 }
                                : { left: 360 },
                            spacing: {
                                after: 100
                            }
                        }, isArabic)
                    );
                }    

            } else if (item.type === "list") {

                for (const listItem of item.items) {

                    const listRuns = [];

                    for (const run of listItem.runs || []) {

                        if (run.type === "text") {

                            listRuns.push(
                                createTextRun({
                                    text: run.text,
                                    bold: run.bold || false,
                                    italics: run.italics || false
                                }, isArabic)
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
                                        createTextRun({
                                            text: run.text,
                                            style: "Hyperlink",
                                            bold: run.bold || false,
                                            italics: run.italics || false
                                        }, isArabic)
                                    ],
                                    link: run.href
                                })
                            );
                        }
                    }

                    if (listItem.ordered) {

                        children.push(
                            createParagraph({
                                children: listRuns,
                                numbering: {
                                    reference: "lesson-numbered-list",
                                    level: listItem.level
                                },
                                alignment:AlignmentType.LEFT,
                                bidirectional: isArabic
                            }, isArabic)
                        );

                    } else {

                        // CHANGED: was `bullet: { level: listItem.level }`.
                        // The built-in `bullet` shorthand always renders a
                        // hardcoded LTR numbering definition (lvlJc="left"),
                        // no matter what paragraph settings you pass. Using
                        // our own "lesson-bullet-list" numbering reference
                        // (defined below) lets it flip to RTL like the
                        // numbered list does.
                        children.push(
                            createParagraph({
                                children: listRuns,
                                numbering: {
                                    reference: "lesson-bullet-list",
                                    level: listItem.level
                                },
                                alignment: AlignmentType.LEFT,
                                bidirectional: isArabic
                            }, isArabic)
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
                                        createTextRun({
                                            text: run.text,
                                            bold: run.bold || false,
                                            italics: run.italics || false
                                        }, isArabic)
                                    );

                                } else if (run.type === "code") {

                                    cellRuns.push(
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
                                                createTextRun({
                                                    text: run.text,
                                                    style: "Hyperlink",
                                                    bold: run.bold || false,
                                                    italics: run.italics || false
                                                }, isArabic)
                                            ],
                                            link: run.href
                                        })
                                    );
                                }
                            }

                            return new TableCell({
                                children: [
                                    createParagraph({
                                        children: cellRuns,
                        
                        
                                    }, isArabic)
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
                    createParagraph({
                        children: [
                            new TextRun({
                                text: item.text,
                                font: "Courier New",
                                rightToLeft: false
                            })
                        ],
                        alignment: AlignmentType.LEFT,
                        bidirectional: false,
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
                    }, isArabic)
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
                        createParagraph({
                            children: [
                                new ImageRun({
                                    data: imageBuffer,
                                    transformation: {
                                        width,
                                        height
                                    }
                                })
                            ]
                        }, isArabic)
                    );

                } catch (error) {
                    console.log(`Could not download image: ${item.src}`);
                }
            }

            else if (item.type === "video") {

                children.push(
                    createParagraph({
                        children: [
                            new ExternalHyperlink({
                                children: [
                                    createTextRun({
                                        text: isArabic ? "▶ مشاهدة الفيديو" : "▶ Watch video",
                                        style: "Hyperlink"
                                    }, isArabic)
                                ],
                                link: item.src
                            })
                        ]
                    }, isArabic)
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
                            format: LevelFormat.DECIMAL,
                            text: "%1.",
                            alignment: isArabic ? AlignmentType.END : AlignmentType.START,
                            // ADDED: Word inserts a TAB between the marker
                            // and the text by default, and that tab stop's
                            // position is computed left-to-right even
                            // inside an RTL paragraph — this is what
                            // causes the big empty gap between the marker
                            // and the text in Word. A plain space avoids
                            // the tab-stop math entirely.
                            suffix: isArabic ? LevelSuffix.SPACE : LevelSuffix.TAB,
                            style: {
                                paragraph: {
                                    // CHANGED: was `{ start: 360, hanging: 360 }`.
                                    // `start`/`end` are logical indent
                                    // properties, but Word does not mirror
                                    // a numbering LEVEL's indent based on
                                    // the paragraph's bidi setting the way
                                    // it does for a paragraph's own indent.
                                    // Physical right/left is what actually
                                    // moves the number to the correct side.
                                    indent: isArabic
                                        ? { right: 360, hanging: 300 }
                                        : { left: 360, hanging: 360 }
                                }
                            }
                        },
                        {
                            level: 1,
                            format: LevelFormat.LOWER_ROMAN,
                            text: "%2.",
                            alignment: isArabic ? AlignmentType.END : AlignmentType.START,
                            suffix: isArabic ? LevelSuffix.SPACE : LevelSuffix.TAB,
                            style: {
                                paragraph: {
                                    // CHANGED: same fix as level 0 above.
                                    indent: isArabic
                                        ? { right: 720, hanging: 300 }
                                        : { left: 720, hanging: 360 }
                                }
                            }
                        },
                        {
                            level: 2,
                            format: LevelFormat.LOWER_LETTER,
                            text: "%3.",
                            alignment: isArabic ? AlignmentType.END : AlignmentType.START,
                            suffix: isArabic ? LevelSuffix.SPACE : LevelSuffix.TAB,
                            style: {
                                paragraph: {
                                    // CHANGED: same fix as level 0 above.
                                    indent: isArabic
                                        ? { right: 1080, hanging: 300 }
                                        : { left: 1080, hanging: 360 }
                                }
                            }
                        }
                    ]
                },
                // ADDED: dedicated numbering definition for unordered
                // (bullet) lists. Previously the code used the `bullet:`
                // paragraph shorthand, which always generates a hardcoded
                // LTR-only numbering definition (lvlJc="left") that cannot
                // be flipped by any paragraph-level setting. Defining our
                // own reference here — same pattern as the numbered list —
                // lets bullets go RTL for Arabic content.
                {
                    reference: "lesson-bullet-list",
                    levels: [
                        {
                            level: 0,
                            format: LevelFormat.BULLET,
                            text: "•",
                            alignment: isArabic
                                ? AlignmentType.RIGHT
                                : AlignmentType.LEFT,
                            suffix: isArabic
                                ? LevelSuffix.SPACE
                                : LevelSuffix.TAB,
                            style: {
                                paragraph: {
                                    indent: isArabic
                                        ? { right: 0, hanging: 0 }
                                        : { left: 360, hanging: 360 }
                                }
                            }
                        },
                        {
                            level: 1,
                            format: LevelFormat.BULLET,
                            text: "◦",
                            alignment: isArabic
                                ? AlignmentType.RIGHT
                                : AlignmentType.LEFT,
                            suffix: isArabic
                                ? LevelSuffix.SPACE
                                : LevelSuffix.TAB,
                            style: {
                                paragraph: {
                                    indent: isArabic
                                        ? { right: 0, hanging: 0 }
                                        : { left: 720, hanging: 360 }
                                }
                            }
                        },
                        {
                            level: 2,
                            format: LevelFormat.BULLET,
                            text: "▪",
                            alignment: isArabic
                                ? AlignmentType.RIGHT
                                : AlignmentType.LEFT,
                            suffix: isArabic
                                ? LevelSuffix.SPACE
                                : LevelSuffix.TAB,
                            style: {
                                paragraph: {
                                    indent: isArabic
                                        ? { right: 0, hanging: 0 }
                                        : { left: 1080, hanging: 360 }
                                }
                            }
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
                            createParagraph({
                
                                children: [
                                    new TextRun({
                                        children: [
                                            isArabic ? "الصفحة " : "Page ",
                                            PageNumber.CURRENT
                                        ]
                                    })
                                ]
                            }, isArabic)
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