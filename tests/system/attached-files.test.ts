import { afterAll, describe, expect, it } from 'vitest';

import {
  callTool,
  callToolRaw,
  cleanupTestNotes,
  extractNoteBody,
  findNoteId,
  sleep,
  trashNote,
  uniqueTitle,
} from './inspector.js';

const TEST_PREFIX = '[Bear-MCP-stest-attached-files]';
const RUN_ID = Date.now();
const PAUSE_AFTER_WRITE_OP = 100;
// Bear's file indexing is asynchronous — wait for the ZSFNOTEFILE row to appear
const PAUSE_AFTER_FILE_ATTACH = 2_000;

// Minimal 1x1 transparent PNG (67 bytes)
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
          filename: 'test-pixel.png',
          base64_content: TINY_PNG_BASE64,
        },
      });

      await sleep(PAUSE_AFTER_FILE_ATTACH);

      const response = callToolRaw({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      // File metadata must be in a separate content block, not concatenated into block 0
      expect(response.content).toHaveLength(2);
      expect(response.content[0].text).not.toContain('#Attached Files');
      expect(response.content[1].text).toContain('Attached Files');
      expect(response.content[1].text).toContain('test-pixel.png');
    } finally {
      if (noteId) trashNote(noteId);
    }
  });

  it('note without attachment returns single content block with no files mention', async () => {
    const title = uniqueTitle(TEST_PREFIX, 'No File', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Just plain text', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      const response = callToolRaw({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).not.toContain('#Attached Files');
      expect(response.content[0].text).not.toContain('No files attached');
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

      // Attach two files sequentially — Bear processes each via URL scheme
      callTool({
        toolName: 'bear-add-file',
        args: { id: noteId, filename: 'first.png', base64_content: TINY_PNG_BASE64 },
      });
      callTool({
        toolName: 'bear-add-file',
        args: { id: noteId, filename: 'second.png', base64_content: TINY_PNG_BASE64 },
      });

      await sleep(PAUSE_AFTER_FILE_ATTACH);

      const response = callToolRaw({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      expect(response.content).toHaveLength(2);
      expect(response.content[0].text).not.toContain('#Attached Files');
      // Both filenames must appear in the files block
      expect(response.content[1].text).toContain('first.png');
      expect(response.content[1].text).toContain('second.png');
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
      const response = callToolRaw({
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
      const afterResponse = callToolRaw({
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
