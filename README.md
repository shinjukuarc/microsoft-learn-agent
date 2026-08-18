# Microsoft Learn Extractor

A tool that extracts Microsoft Learn modules and learning paths into Word documents.

## Features

- Extracts Microsoft Learn modules
- Supports learning paths containing multiple modules
- Saves extracted content as `.docx` Word documents
- Includes text and images where available
- Skips module assessments
- Saves progress while extracting, allowing interrupted modules to resume

## Installation

There are two versions available from the Releases page.

### With Node.js Included

Download:

`Microsoft-Learn-Extractor-With-Node.zip`

Use this version if you do not have Node.js installed.

1. Download and extract the ZIP.
2. Run `Setup.bat`.
3. Wait for setup to finish.
4. Run `Microsoft-Learn-Extractor.bat`.
5. Paste one or more Microsoft Learn URLs.
6. Press Enter on an empty line to begin extraction.

### Without Node.js

Download:

`Microsoft-Learn-Extractor-Without-Node.zip`

Use this version if you already have a compatible version of Node.js installed.

1. Download and extract the ZIP.
2. Run `Setup.bat`.
3. Wait for setup to finish.
4. Run `Microsoft-Learn-Extractor.bat`.
5. Paste one or more Microsoft Learn URLs.
6. Press Enter on an empty line to begin extraction.

## Output

Extracted Word documents are saved in:

```text
output/