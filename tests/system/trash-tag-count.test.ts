import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { archiveNote, callTool, cleanupTestNotes, findNoteId, uniqueTitle } from './inspector.js';

const TEST_PREFIX = '[Bear-MCP-stest-trash-tag-count]';
const RUN_ID = Date.now();

// Unique tag per run — ensures no cross-contamination with other notes in the library
const TAG = `stest77-${RUN_ID}`;

let noteId: string;

beforeAll(() => {
  const noteTitle = uniqueTitle(TEST_PREFIX, 'TagCount', RUN_ID);
  callTool({ toolName: 'bear-create-note', args: { title: noteTitle, tags: TAG } });
  noteId = findNoteId(noteTitle);
});

afterAll(() => {
  cleanupTestNotes(TEST_PREFIX);
});

describe('bear-list-tags excludes archived/trashed notes from counts', () => {
  it('tag appears in bear-list-tags when its note is active', () => {
    const result = callTool({ toolName: 'bear-list-tags', args: {} });

    expect(result).toContain(TAG);
  });

  it('tag disappears from bear-list-tags after its only note is archived', () => {
    archiveNote(noteId);

    const result = callTool({ toolName: 'bear-list-tags', args: {} });

    // Tag has no active notes — noteCount drops to 0, buildTagHierarchy filters it out
    expect(result).not.toContain(TAG);
  });
});
