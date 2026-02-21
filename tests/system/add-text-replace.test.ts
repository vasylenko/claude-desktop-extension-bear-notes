import { afterAll, describe, expect, it } from 'vitest';

import {
  archiveNote,
  callTool,
  cleanupTestNotes,
  extractNoteBody,
  findNoteId,
  uniqueTitle,
} from './inspector.js';

const TEST_PREFIX = '[Bear-MCP-stest-add-text-replace]';
const RUN_ID = Date.now();

/** Bear processes URL callbacks asynchronously — pause to let writes settle. */
function syncSleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

afterAll(() => {
  cleanupTestNotes(TEST_PREFIX);
});

describe('bear-add-text replace mode via MCP Inspector CLI', () => {
  it('replaces full note content', () => {
    const title = uniqueTitle(TEST_PREFIX, 'Full Replace', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Original body content', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      callTool({
        toolName: 'bear-add-text',
        args: { id: noteId, text: 'Completely new content', mode: 'replace' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      syncSleep(500);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);
      expect(noteBody).toContain('Completely new content');
      expect(noteBody).not.toContain('Original body content');

      // Bear's replace mode preserves the note title
      expect(openResult).toContain(title);
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('replaces only the targeted section under a header', () => {
    const title = uniqueTitle(TEST_PREFIX, 'Section Replace', RUN_ID);
    let noteId: string | undefined;

    const sectionedText = [
      '## Introduction',
      'Original intro text',
      '',
      '## Details',
      'Original details text',
      '',
      '## Conclusion',
      'Original conclusion text',
    ].join('\n');

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: sectionedText, tags: 'system-test' },
      });

      noteId = findNoteId(title);

      callTool({
        toolName: 'bear-add-text',
        args: { id: noteId, text: 'Updated details text', header: 'Details', mode: 'replace' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      syncSleep(500);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);
      expect(noteBody).toContain('Updated details text');
      // Other sections remain untouched
      expect(noteBody).toContain('Original intro text');
      expect(noteBody).toContain('Original conclusion text');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('blocks replace when content replacement is not enabled', () => {
    const title = uniqueTitle(TEST_PREFIX, 'Flag Off', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Guarded content', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      const result = callTool({
        toolName: 'bear-add-text',
        args: { id: noteId, text: 'new content', mode: 'replace' },
        env: {},
      });

      expect(result).toContain('not enabled');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('returns error when targeting a non-existent header', () => {
    const title = uniqueTitle(TEST_PREFIX, 'Bad Header', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Some simple content', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      const result = callTool({
        toolName: 'bear-add-text',
        args: { id: noteId, text: 'new content', header: 'NonExistentSection', mode: 'replace' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      expect(result).toContain('not found');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('regression — default append still works without mode', () => {
    const title = uniqueTitle(TEST_PREFIX, 'Append Default', RUN_ID);
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
