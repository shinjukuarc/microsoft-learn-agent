# Microsoft Learn Extractor

A Windows tool that extracts Microsoft Learn modules and learning paths into Word documents.

## Download

There are two versions available.

### With Node.js Included

[Download Microsoft-Learn-Extractor-With-Node](https://github.com/shinjukuarc/microsoft-learn-agent/releases/download/v2.0.1/microsoft-learn-agent-with-node.zip)

1. Download the ZIP file.
2. Extract it.
3. Open the extracted folder.
4. Run `Setup.bat`.
5. Wait for setup to finish.
6. Run `Microsoft-Learn-Extractor.bat`.
7. Paste one or more Microsoft Learn URLs.
8. Press Enter on an empty line to begin extraction.

### Without Node.js

[Download Microsoft-Learn-Extractor-Without-Node](https://github.com/shinjukuarc/microsoft-learn-agent/releases/download/v2.0.1/microsoft-learn-agent-without-node.zip)

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
```

Press Enter on an empty line when you have finished entering URLs.

## Arabic Translation

You can translate the extracted content to Arabic by selecting `y` when prompted:

```text
Translate extracted content to Arabic? (y/n): y
```

The program uses **Gemini** as the primary translator, with **Mistral** and **OpenRouter** as automatic fallbacks.

Arabic documents are saved with `- Arabic` at the end of the filename.
