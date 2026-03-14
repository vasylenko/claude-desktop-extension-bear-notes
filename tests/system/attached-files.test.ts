import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
// 262x400 JPEG with bold "make it simple" text — Bear can OCR this
const OCR_JPG_BASE64 = readFileSync(resolve(__dirname, '../fixtures/ocr-text.jpg')).toString(
  'base64'
);

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
      expect(response.content[0].text).not.toContain('# Attached Files');
      expect(response.content[1].text).toContain('# Attached Files');
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
      expect(response.content[0].text).not.toContain('# Attached Files');
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
      expect(response.content[0].text).not.toContain('# Attached Files');
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

      // Poll until Bear indexes the file — the test is meaningless without 2 content blocks
      const response = await waitForFileContent(noteId, 'test-pixel.png');
      expect(response.content).toHaveLength(2);

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
      expect(afterBody).not.toContain('# Attached Files');
      expect(afterBody).not.toContain('File content not available');
    } finally {
      if (noteId) trashNote(noteId);
    }
  });
});
