import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, describe, expect, it } from 'vitest';

import { callTool, extractNoteBody, extractNoteId } from './inspector.js';

const FIXTURE_TEXT = readFileSync(
  resolve(import.meta.dirname, '../../fixtures/sample-note.md'),
  'utf-8'
);

const TEST_PREFIX = '[Bear-MCP-stest-note-convention]';

function uniqueTitle(label: string): string {
  return `${TEST_PREFIX} ${label} ${Date.now()}`;
}

/** Search for a test note by its exact title and return its ID. */
function findTestNote(title: string): string {
  const searchResult = callTool({
    toolName: 'bear-search-notes',
    args: { term: title },
  });
  return extractNoteId(searchResult);
}

/** Archive a note by ID, swallowing errors during cleanup. */
function archiveNote(id: string): void {
  try {
    callTool({ toolName: 'bear-archive-note', args: { id } });
  } catch {
    // Best-effort cleanup — don't fail the test
  }
}

afterAll(() => {
  // Safety sweep: archive any stray test notes
  try {
    const searchResult = callTool({
      toolName: 'bear-search-notes',
      args: { term: TEST_PREFIX },
    });
    const idMatches = searchResult.matchAll(/ID:\s+([A-Fa-f0-9-]+)/g);
    for (const match of idMatches) {
      archiveNote(match[1]);
    }
  } catch {
    // Best-effort — test notes may already be archived
  }
});

describe('note conventions via MCP Inspector CLI', () => {
  it('convention OFF — tags placed by Bear via URL params', () => {
    const title = uniqueTitle('Conv Off');
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: FIXTURE_TEXT, tags: 'system-test' },
        // No env override — convention OFF by default
      });

      noteId = findTestNote(title);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);

      // Bear places tags via URL params — they appear after the title, not embedded at start of text
      // The note body should NOT start with #system-test\n--- (that's the convention ON pattern)
      expect(noteBody).not.toMatch(/^#system-test\n---/);
      // The fixture content should be present in the body
      expect(noteBody).toContain('Quarterly Infrastructure Review');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('convention ON — tags embedded in text body with separator', () => {
    const title = uniqueTitle('Conv On Tags+Text');
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: FIXTURE_TEXT, tags: 'system-test,system-test/system-test' },
        env: { UI_ENABLE_NEW_NOTE_CONVENTION: 'true' },
      });

      noteId = findTestNote(title);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);

      // Verify structure: tag line → separator → fixture content (in that order)
      expect(noteBody).toMatch(/#system-test #system-test\/system-test#\n---\n[\s\S]*Quarterly Infrastructure Review/);
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('convention ON — tags only, no text', () => {
    const title = uniqueTitle('Conv On Tags Only');
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, tags: 'system-test' },
        env: { UI_ENABLE_NEW_NOTE_CONVENTION: 'true' },
      });

      noteId = findTestNote(title);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);

      // Just the tag line, no separator (no text body to separate from)
      expect(noteBody).toContain('#system-test');
      // No separator since there's no text content
      expect(noteBody).not.toContain('---\n');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('convention ON — no tags, text passes through unchanged', () => {
    const title = uniqueTitle('Conv On No Tags');
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: FIXTURE_TEXT },
        env: { UI_ENABLE_NEW_NOTE_CONVENTION: 'true' },
      });

      noteId = findTestNote(title);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);

      // No tag line, no separator — just the fixture content
      expect(noteBody).toContain('Quarterly Infrastructure Review');
      expect(noteBody).not.toMatch(/#\w+\n---/);
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });
});
