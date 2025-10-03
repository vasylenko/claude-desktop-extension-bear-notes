# Abstract
Goal of this task is to implement new feature to this extension – add support for adding files to Bear notes.

We must reverse-engineer how Claude files feature work and implement a creative, efficient way to pass the files to Bear.

Important nuance: we should NOT simply tell Claude that file must be base64 encoded (e.g., through MCP tool description) because Claude will use LLM to do the base64 – this is highly inefficient, slow and waste of tokens.

How I see this, is that we must elegantly 'trick' Claude to run a scipt for that, and this must be a robust implementation – predictable and effective.

# Details

## Bear API

`/add-file`
append or prepend a file to a note identified by its title or id. This call can’t be performed if the app is a locked state. Encrypted notes can’t be accessed with this call.

Parameters:

- `id` optional note unique identifier.
- `title` optional note title.
- `selected` optional if yes use the note currently selected in Bear (token required)
- `file` required base64 representation of a file.
- `header` optional if specified add the file to the corresponding header inside the note.
- `filename` required file name with extension. Both file and filename are required to successfully add a file.
- `mode` optional the allowed values are prepend, append, replace_all and replace (keep the note’s title untouched).
- `open_note` optional if no do not display the new note in Bear’s main or external window.
- `new_window` optional if yes open the note in an external window (MacOS only).
- `show_window` optional if no the call don’t force the opening of bear main window (MacOS only).
- `edit` optional if yes place the cursor inside the note editor.

Example:

`bear://x-callback-url/add-file?filename=test.gif&id=4EDAF0D1-2EFF-4190-BC1D-67D9BAE49BA9-28433-000187BAA3D182EF&mode=append&file=R0lGODlhAQABAIAAAP%2F%2F%2F%2F%2F%2F%2FyH5BAEKAAEALAAAAAABAAEAAAICTAEAOw%3D%3D`

Special Notes:

The base64 file parameter have to be encoded when passed as an url parameter.v

## Claude Desktop API

Anthopic does not provide API for MCP servers to interact with its built-in files feature, so we must explore, reverse-engineer and improvise. 

Release blog: https://www.anthropic.com/news/create-files

Documentation page: https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude

My Key observations when I create files in Claude
- Claude ran a tool that explains how to create PDF files using scripts.
- Then it created a script in sandboxed environment (we dont have access to it!) to create the specific file and ran that script.
- File was created and was available for me via "Download" button – I could download it (Claude runs in Electron, so is kinda web browser) but could not find the original file location on my Mac.

Here is the detailed output from the Claude chat:

1. `Reading the PDF skill documentation to understand how to create PDFs properly`
```Tool invocation details
    bash

    cd /mnt/skills/public/pdf && cat SKILL.md

    Output:

    ---
    name: pdf
    description: Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms.
    when_to_use: When Claude needs to fill in a PDF form or programmatically process, generate, or analyze PDF documents at scale.
    version: 0.0.1
    dependencies: pytesseract>=0.3.10, pdf2image>=1.16.0
    ---

    # PDF Processing Guide

    ## Overview

    This guide covers essential PDF processing operations using Python libraries and command-line tools. For advanced features, JavaScript libraries, and detailed examples, see REFERENCE.md. If you need to fill out a PDF form, read FORMS.md and follow its instructions.

    ## Quick Start

    ```python
    from pypdf import PdfReader, PdfWriter

    # Read a PDF
    reader = PdfReader("document.pdf")
    print(f"Pages: {len(reader.pages)}")

    # Extract text
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    ```

    ## Python Libraries

    ### pypdf - Basic Operations

    #### Merge PDFs
    ```python
    from pypdf import PdfWriter, PdfReader

    writer = PdfWriter()
    for pdf_file in ["doc1.pdf", "doc2.pdf", "doc3.pdf"]:
        reader = PdfReader(pdf_file)
        for page in reader.pages:
            writer.add_page(page)

    with open("merged.pdf", "wb") as output:
        writer.write(output)
    ```

    #### Split PDF
    ```python
    reader = PdfReader("input.pdf")
    for i, page in enumerate(reader.pages):
        writer = PdfWriter()
        writer.add_page(page)
        with open(f"page_{i+1}.pdf", "wb") as output:
            writer.write(output)
    ```

    #### Extract Metadata
    ```python
    reader = PdfReader("document.pdf")
    meta = reader.metadata
    print(f"Title: {meta.title}")
    print(f"Author: {meta.author}")
    print(f"Subject: {meta.subject}")
    print(f"Creator: {meta.creator}")
    ```

    #### Rotate Pages
    ```python
    reader = PdfReader("input.pdf")
    writer = PdfWriter()

    page = reader.pages[0]
    page.rotate(90)  # Rotate 90 degrees clockwise
    writer.add_page(page)

    with open("rotated.pdf", "wb") as output:
        writer.write(output)
    ```

    ### pdfplumber - Text and Table Extraction

    #### Extract Text with Layout
    ```python
    import pdfplumber

    with pdfplumber.open("document.pdf") as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            print(text)
    ```

    #### Extract Tables
    ```python
    with pdfplumber.open("document.pdf") as pdf:
        for i, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            for j, table in enumerate(tables):
                print(f"Table {j+1} on page {i+1}:")
                for row in table:
                    print(row)
    ```

    #### Advanced Table Extraction
    ```python
    import pandas as pd

    with pdfplumber.open("document.pdf") as pdf:
        all_tables = []
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                if table:  # Check if table is not empty
                    df = pd.DataFrame(table[1:], columns=table[0])
                    all_tables.append(df)

    # Combine all tables
    if all_tables:
        combined_df = pd.concat(all_tables, ignore_index=True)
        combined_df.to_excel("extracted_tables.xlsx", index=False)
    ```

    ### reportlab - Create PDFs

    #### Basic PDF Creation
    ```python
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    c = canvas.Canvas("hello.pdf", pagesize=letter)
    width, height = letter

    # Add text
    c.drawString(100, height - 100, "Hello World!")
    c.drawString(100, height - 120, "This is a PDF created with reportlab")

    # Add a line
    c.line(100, height - 140, 400, height - 140)

    # Save
    c.save()
    ```

    #### Create PDF with Multiple Pages
    ```python
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet

    doc = SimpleDocTemplate("report.pdf", pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Add content
    title = Paragraph("Report Title", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 12))

    body = Paragraph("This is the body of the report. " * 20, styles['Normal'])
    story.append(body)
    story.append(PageBreak())

    # Page 2
    story.append(Paragraph("Page 2", styles['Heading1']))
    story.append(Paragraph("Content for page 2", styles['Normal']))

    # Build PDF
    doc.build(story)
    ```

    ## Command-Line Tools

    ### pdftotext (poppler-utils)
    ```bash
    # Extract text
    pdftotext input.pdf output.txt

    # Extract text preserving layout
    pdftotext -layout input.pdf output.txt

    # Extract specific pages
    pdftotext -f 1 -l 5 input.pdf output.txt  # Pages 1-5
    ```

    ### qpdf
    ```bash
    # Merge PDFs
    qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf

    # Split pages
    qpdf input.pdf --pages . 1-5 -- pages1-5.pdf
    qpdf input.pdf --pages . 6-10 -- pages6-10.pdf

    # Rotate pages
    qpdf input.pdf output.pdf --rotate=+90:1  # Rotate page 1 by 90 degrees

    # Remove password
    qpdf --password=mypassword --decrypt encrypted.pdf decrypted.pdf
    ```

    ### pdftk (if available)
    ```bash
    # Merge
    pdftk file1.pdf file2.pdf cat output merged.pdf

    # Split
    pdftk input.pdf burst

    # Rotate
    pdftk input.pdf rotate 1east output rotated.pdf
    ```

    ## Common Tasks

    ### Extract Text from Scanned PDFs
    ```python
    # Requires: pip install pytesseract pdf2image
    import pytesseract
    from pdf2image import convert_from_path

    # Convert PDF to images
    images = convert_from_path('scanned.pdf')

    # OCR each page
    text = ""
    for i, image in enumerate(images):
        text += f"Page {i+1}:\n"
        text += pytesseract.image_to_string(image)
        text += "\n\n"

    print(text)
    ```

    ### Add Watermark
    ```python
    from pypdf import PdfReader, PdfWriter

    # Create watermark (or load existing)
    watermark = PdfReader("watermark.pdf").pages[0]

    # Apply to all pages
    reader = PdfReader("document.pdf")
    writer = PdfWriter()

    for page in reader.pages:
        page.merge_page(watermark)
        writer.add_page(page)

    with open("watermarked.pdf", "wb") as output:
        writer.write(output)
    ```

    ### Extract Images
    ```bash
    # Using pdfimages (poppler-utils)
    pdfimages -j input.pdf output_prefix

    # This extracts all images as output_prefix-000.jpg, output_prefix-001.jpg, etc.
    ```

    ### Password Protection
    ```python
    from pypdf import PdfReader, PdfWriter

    reader = PdfReader("input.pdf")
    writer = PdfWriter()

    for page in reader.pages:
        writer.add_page(page)

    # Add password
    writer.encrypt("userpassword", "ownerpassword")

    with open("encrypted.pdf", "wb") as output:
        writer.write(output)
    ```

    ## Quick Reference

    | Task | Best Tool | Command/Code |
    |------|-----------|--------------|
    | Merge PDFs | pypdf | `writer.add_page(page)` |
    | Split PDFs | pypdf | One page per file |
    | Extract text | pdfplumber | `page.extract_text()` |
    | Extract tables | pdfplumber | `page.extract_tables()` |
    | Create PDFs | reportlab | Canvas or Platypus |
    | Command line merge | qpdf | `qpdf --empty --pages ...` |
    | OCR scanned PDFs | pytesseract | Convert to image first |
    | Fill PDF forms | pdf-lib or pypdf (see FORMS.md) | See FORMS.md |

    ## Next Steps

    - For advanced pypdfium2 usage, see REFERENCE.md
    - For JavaScript libraries (pdf-lib), see REFERENCE.md
    - If you need to fill out a PDF form, follow the instructions in FORMS.md
    - For troubleshooting guides, see REFERENCE.md
```

2. `Now I'll create a PDF with the poem using reportlab:`
```Tool invocation details
    Installing reportlab to create the PDF
    bash

    pip install reportlab --break-system-packages -q
    Output

    exit code 0
```

3. `Creating Python script to generate PDF with the poem create_poem_pdf.py`
```Tool invocation details
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import inch

    # Create PDF
    c = canvas.Canvas("/mnt/user-data/outputs/machine_hymn.pdf", pagesize=letter)
    width, height = letter

    # Set up formatting
    title_size = 24
    body_size = 12
    line_spacing = body_size * 1.5

    # Starting position
    y_position = height - inch

    # Title
    c.setFont("Helvetica-Bold", title_size)
    c.drawString(inch, y_position, "Machine Hymn")
    y_position -= line_spacing * 2

    # Poem content
    c.setFont("Courier", body_size)
    poem_lines = [
        "The pipeline runs at 3 AM,",
        "green checks cascade like rain.",
        "No human hand to guide it now—",
        "just logic, cold and plain.",
        "",
        "The code deploys, the servers hum,",
        "infrastructure as verse.",
        "Each function call a measured beat,",
        "precise, rehearsed, terse.",
        "",
        "Abstractions layer, clean and tight,",
        "KISS carved in every line.",
        "What worked before we'll use again—",
        "DRY principles, by design.",
        "",
        "The logs scroll past like poetry,",
        "milliseconds counted true.",
        "No wasted motion, no excess—",
        "just systems, tried and new.",
    ]

    for line in poem_lines:
        c.drawString(inch, y_position, line)
        y_position -= line_spacing

    # Save
    c.save()
    print("PDF created successfully")
```

4. `Running the script to generate the PDF`
```Tool invocation details
    bash

    cd /home/claude && python create_poem_pdf.py
    Output

    PDF created successfully
```

# Implementation Plan

## Solution Architecture

**Key Insight**: We don't need to trick Claude into encoding files via scripts. The MCP server runs in Node.js on the user's machine with full filesystem access. We simply:
1. Accept a file path from Claude as a tool parameter
2. Read and base64-encode the file **in our Node.js code** (efficient, no LLM tokens used)
3. Pass the encoded content to Bear's `/add-file` API

This follows KISS (Keep It Simple) and reuses our existing architecture pattern.

## Implementation Steps

### 1. Add File Reading Utility (src/utils.ts)
- Function `readAndEncodeFile(filePath: string): { filename: string, base64Content: string }`
- Uses Node.js `fs.readFileSync()` and `Buffer.toString('base64')`
- Extracts filename from path using `path.basename()`
- Error handling for file not found, permission denied, etc.

### 2. Extend Existing Bear URL Builder (src/bear-urls.ts)
**Reuse existing `buildBearUrl()` function** (follows DRY principle):
- Add `file?: string` and `filename?: string` to `BearUrlParams` interface
- Add `'file'` and `'filename'` to the `stringParams` array
- No new function needed - existing URLSearchParams encoding handles base64 correctly
- Works automatically with `add-file` action

### 3. Register New MCP Tool (src/main.ts)
- Tool name: `bear-add-file`
- Required params: `file_path` (absolute path), either `id` or `title`
- For the `mode`, always use append to ensure we add the file at the end of the document; will start simple; and no other extra options for window or other stuff
- Tool handler: read file → encode → call `buildBearUrl('add-file', {...})` → execute via `executeBearXCallbackApi()`
- Follows same pattern as existing tools (bear-create-note, bear-add-text-*)

### 4. Error Handling & Validation
- Path normalization: use `path.resolve()` to convert relative paths to absolute
- File validation handled by `fs.readFileSync()` - throws clear errors for non-existent/unreadable files
- Error messages bubble up naturally with descriptive context

## Files to Modify
- `src/utils.ts` - add file encoding function
- `src/bear-urls.ts` - extend BearUrlParams interface and stringParams array (2 lines)
- `src/main.ts` - register new tool

## Non-Goals (YAGNI)
- ❌ No need to integrate with Claude's file creation feature
- ❌ No need for scripts or "tricking" Claude
- ❌ No file size limits initially (Bear will reject if too large)
- ❌ No file type validation (let Bear handle it)