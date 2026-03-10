import { afterAll, describe, expect, it } from 'vitest';

import {
  callTool,
  cleanupTestNotes,
  extractNoteBody,
  trashNote,
  tryExtractNoteId,
  uniqueTitle,
} from './inspector.js';

const TEST_PREFIX = '[Bear-MCP-stest-open-by-title]';
const RUN_ID = Date.now();

function title(label: string): string {
  return uniqueTitle(TEST_PREFIX, label, RUN_ID);
}

afterAll(() => {
  cleanupTestNotes(TEST_PREFIX);
});

describe('bear-open-note by title', () => {
  it('opens a note by exact title', () => {
    const noteTitle = title('Unique');
    const noteText = 'Content for open-by-title test';
    let noteId: string | undefined;

    try {
      const createResult = callTool({
        toolName: 'bear-create-note',
        args: { title: noteTitle, text: noteText },
      });
      noteId = tryExtractNoteId(createResult) ?? undefined;

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { title: noteTitle },
      });

      expect(openResult).toContain(noteTitle);
      expect(extractNoteBody(openResult)).toContain(noteText);
      // Response must include the note ID for follow-up operations
      expect(tryExtractNoteId(openResult)).toBeTruthy();
    } finally {
      if (noteId) trashNote(noteId);
    }
  });

  it('title matching is case-insensitive', () => {
    const noteTitle = title('CaseTest');
    let noteId: string | undefined;

    try {
      const createResult = callTool({
        toolName: 'bear-create-note',
        args: { title: noteTitle, text: 'Case sensitivity test' },
      });
      noteId = tryExtractNoteId(createResult) ?? undefined;

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { title: noteTitle.toLowerCase() },
      });

      expect(openResult).toContain(noteTitle);
    } finally {
      if (noteId) trashNote(noteId);
    }
  });

  it('returns not-found error for non-existent title', () => {
    const openResult = callTool({
      toolName: 'bear-open-note',
      args: { title: `Non-existent note ${RUN_ID}` },
    });

    expect(openResult).toContain('No note found with title');
  });

  it('returns disambiguation list when multiple notes share the same title', () => {
    const sharedTitle = title('Duplicate');
    const noteIds: string[] = [];

    try {
      // Create two notes with the same title
      for (const text of ['First duplicate', 'Second duplicate']) {
        const createResult = callTool({
          toolName: 'bear-create-note',
          args: { title: sharedTitle, text },
        });
        const id = tryExtractNoteId(createResult);
        if (id) noteIds.push(id);
      }

      expect(noteIds.length).toBe(2);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { title: sharedTitle },
      });

      expect(openResult).toContain('Multiple notes found');
      // Both IDs should appear in the disambiguation list
      for (const id of noteIds) {
        expect(openResult).toContain(id);
      }
    } finally {
      for (const id of noteIds) {
        trashNote(id);
      }
    }
  });
});
