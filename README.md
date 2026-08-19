# Microsoft Learn Extractor

A Windows tool that extracts Microsoft Learn modules and learning paths into Word documents.

## Features

- Extract Microsoft Learn modules
- Extract complete Microsoft Learn learning paths
- Save extracted content as `.docx` Word documents
- Extract text and images where available
- Skip module assessments
- Save extraction progress
- Resume interrupted module extraction
- Process multiple Microsoft Learn URLs

## Download

There are two versions available.

### With Node.js Included

[Download Microsoft-Learn-Extractor-With-Node](https://github.com/shinjukuarc/microsoft-learn-agent/releases/download/v1.0.2/Microsoft-Learn-Extractor-With-Node.zip)

Use this version if you **do not have Node.js installed**.

1. Download the ZIP file.
2. Extract it.
3. Open the extracted folder.
4. Run `Setup.bat`.
5. Wait for setup to finish.
6. Run `Microsoft-Learn-Extractor.bat`.
7. Paste one or more Microsoft Learn URLs.
8. Press Enter on an empty line to begin extraction.

### Without Node.js

[Download Microsoft-Learn-Extractor-Without-Node](https://github.com/shinjukuarc/microsoft-learn-agent/releases/download/v1.0.2/Microsoft-Learn-Extractor-Without-Node.zip)

Use this version if you **already have a compatible version of Node.js installed**.

1. Download the ZIP file.
2. Extract it.
3. Open the extracted folder.
4. Run `Setup.bat`.
5. Wait for setup to finish.
6. Run `Microsoft-Learn-Extractor.bat`.
7. Paste one or more Microsoft Learn URLs.
8. Press Enter on an empty line to begin extraction.

## How to Use

When you run `Microsoft-Learn-Extractor.bat`, paste Microsoft Learn URLs.

You can enter multiple URLs:

```text
https://learn.microsoft.com/en-us/training/modules/example-module/
https://learn.microsoft.com/en-us/training/paths/example-learning-path/
