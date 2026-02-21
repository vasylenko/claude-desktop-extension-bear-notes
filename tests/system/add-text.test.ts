import { afterAll, describe, expect, it } from 'vitest';

import {
  archiveNote,
  callTool,
  cleanupTestNotes,
  extractNoteBody,
  findNoteId,
  uniqueTitle,
} from './inspector.js';

const TEST_PREFIX = '[Bear-MCP-stest-add-text]';
const RUN_ID = Date.now();

/** Bear processes URL callbacks asynchronously — pause to let writes settle. */
function syncSleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

afterAll(() => {
  cleanupTestNotes(TEST_PREFIX);
});

describe('bear-add-text via MCP Inspector CLI', () => {
  it('prepends text to a note', () => {
    const title = uniqueTitle(TEST_PREFIX, 'Prepend', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Original content', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      callTool({
        toolName: 'bear-add-text',
        args: { id: noteId, text: 'Prepended text', position: 'beginning' },
      });

      syncSleep(500);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);
      expect(noteBody).toContain('Original content');
      expect(noteBody).toContain('Prepended text');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('appends text to a specific section via header', () => {
    const title = uniqueTitle(TEST_PREFIX, 'Append Header', RUN_ID);
    let noteId: string | undefined;

    const sectionedText = [
      '## Notes',
      'Existing note text',
      '',
      '## Action Items',
      'Existing action items',
    ].join('\n');

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: sectionedText, tags: 'system-test' },
      });

      noteId = findNoteId(title);

      callTool({
        toolName: 'bear-add-text',
        args: { id: noteId, text: 'New action item appended', header: 'Action Items' },
      });

      syncSleep(500);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);
      expect(noteBody).toContain('New action item appended');
      expect(noteBody).toContain('Existing note text');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('appends text to a note by default', () => {
    const title = uniqueTitle(TEST_PREFIX, 'Append', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Original content', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      callTool({
        toolName: 'bear-add-text',
        args: { id: noteId, text: 'Appended text' },
      });

      syncSleep(500);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);
      expect(noteBody).toContain('Original content');
      expect(noteBody).toContain('Appended text');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });
});
