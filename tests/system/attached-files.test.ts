import { afterAll, describe, expect, it } from 'vitest';

import {
  callTool,
  cleanupTestNotes,
  extractNoteBody,
  findNoteId,
  sleep,
  trashNote,
  uniqueTitle,
  waitForFileContent,
} from './inspector.js';

const TEST_PREFIX = '[Bear-MCP-stest-attached-files]';
const RUN_ID = Date.now();
const PAUSE_AFTER_WRITE_OP = 100;
// Bear's file indexing is asynchronous — wait for the ZSFNOTEFILE row to appear
const PAUSE_AFTER_FILE_ATTACH = 2_000;
// 262x400 JPEG with bold "make it simple" text — Bear can OCR this
const OCR_JPG_BASE64 =
  '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';

// HTML file — Bear cannot OCR this file type
const HTML_BASE64 = 'PGh0bWw+PGJvZHk+PHA+QmVhciBjYW5ub3QgT0NSIHRoaXM8L3A+PC9ib2R5PjwvaHRtbD4K';

// Minimal 1x1 transparent PNG (67 bytes) — used for corruption test where OCR content doesn't matter
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

afterAll(() => {
  cleanupTestNotes(TEST_PREFIX);
});

describe('attached files content separation', () => {
  it('note with attachment returns file content in a separate content block', async () => {
    const title = uniqueTitle(TEST_PREFIX, 'With File', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Note body text here', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      callTool({
        toolName: 'bear-add-file',
        args: {
          id: noteId,
          filename: 'ocr-text.jpg',
          base64_content: OCR_JPG_BASE64,
        },
      });

      // Poll until Bear finishes OCR — avoids flaky fixed sleeps
      const response = await waitForFileContent(noteId, 'simple');

      // File metadata must be in a separate content block, not concatenated into block 0
      expect(response.content).toHaveLength(2);
      expect(response.content[0].text).not.toContain('#Attached Files');
      expect(response.content[1].text).toContain('#Attached Files');
      expect(response.content[1].text).toContain('ocr-text.jpg');
    } finally {
      if (noteId) trashNote(noteId);
    }
  });

  it('note without attachment returns single content block with no files mention', () => {
    const title = uniqueTitle(TEST_PREFIX, 'No File', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Just plain text', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      const response = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).not.toContain('#Attached Files');
    } finally {
      if (noteId) trashNote(noteId);
    }
  });

  it('note with multiple attachments returns all files in a single second block', async () => {
    const title = uniqueTitle(TEST_PREFIX, 'Multi File', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Multi-file note body', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      // Attach an OCR-able image and a non-OCR-able HTML to exercise both content branches
      callTool({
        toolName: 'bear-add-file',
        args: { id: noteId, filename: 'ocr-text.jpg', base64_content: OCR_JPG_BASE64 },
      });
      callTool({
        toolName: 'bear-add-file',
        args: { id: noteId, filename: 'page.html', base64_content: HTML_BASE64 },
      });

      // Poll until Bear finishes OCR — avoids flaky fixed sleeps
      const response = await waitForFileContent(noteId, 'simple');

      expect(response.content).toHaveLength(2);
      expect(response.content[0].text).not.toContain('#Attached Files');
      const filesBlock = response.content[1].text;
      // OCR-able file: Bear extracts text from the image
      expect(filesBlock).toContain('ocr-text.jpg');
      // Non-OCR-able file: placeholder content
      expect(filesBlock).toContain('page.html');
      expect(filesBlock).toContain('File content not available');
    } finally {
      if (noteId) trashNote(noteId);
    }
  });

  it('full-body replace with text from first content block does not corrupt note', async () => {
    const title = uniqueTitle(TEST_PREFIX, 'No Corrupt', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Original body content', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      callTool({
        toolName: 'bear-add-file',
        args: {
          id: noteId,
          filename: 'test-pixel.png',
          base64_content: TINY_PNG_BASE64,
        },
      });

      await sleep(PAUSE_AFTER_FILE_ATTACH);

      // Read the note — grab only the first content block (what AI would use for replacement)
      const response = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const bodyBlock = response.content[0].text;
      const noteBody = extractNoteBody(bodyBlock);

      // Replace the full note body with the extracted body text
      callTool({
        toolName: 'bear-replace-text',
        args: { id: noteId, scope: 'full-note-body', text: noteBody },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(PAUSE_AFTER_WRITE_OP);

      // Re-read the note and verify no corruption
      const afterResponse = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      // The note body may contain ![](test-pixel.png) — Bear's inline image reference —
      // but must NOT contain the synthetic file metadata section
      const afterBody = afterResponse.content[0].text;
      expect(afterBody).toContain('Original body content');
      expect(afterBody).not.toContain('#Attached Files');
      expect(afterBody).not.toContain('File content not available');
    } finally {
      if (noteId) trashNote(noteId);
    }
  });
});
