import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  callTool,
  cleanupTestNotes,
  findNoteId,
  sleep,
  trashNote,
  uniqueTitle,
} from './inspector.js';

const TEST_PREFIX = '[Bear-MCP-stest-tag-mgmt]';
const RUN_ID = Date.now();
const PAUSE_AFTER_WRITE_OP = 100; // ms to wait after write operations for Bear to process changes

const TAG_ORIGINAL = `stest-tag-mgmt-${RUN_ID}-original`;
const TAG_RENAMED = `stest-tag-mgmt-${RUN_ID}-renamed`;

const NOTE_TITLE = uniqueTitle(TEST_PREFIX, 'TagOps', RUN_ID);

let noteId: string | undefined;

beforeAll(() => {
  callTool({
    toolName: 'bear-create-note',
    args: { title: NOTE_TITLE, text: 'Tag management test note', tags: TAG_ORIGINAL },
  });
  noteId = findNoteId(NOTE_TITLE);
});

afterAll(() => {
  if (noteId) trashNote(noteId);
  cleanupTestNotes(TEST_PREFIX);
});

describe('bear-rename-tag via MCP Inspector CLI', () => {
  it('renames a tag across notes', async () => {
    const result = callTool({
      toolName: 'bear-rename-tag',
      args: { name: TAG_ORIGINAL, new_name: TAG_RENAMED },
    });

    expect(result).toContain('renamed successfully');

    await sleep(PAUSE_AFTER_WRITE_OP);

    // The note should now appear under the renamed tag
    const searchResult = callTool({
      toolName: 'bear-search-notes',
      args: { tag: TAG_RENAMED },
    });

    expect(searchResult).toContain(NOTE_TITLE);
  });

  it('old tag no longer returns results', () => {
    const searchResult = callTool({
      toolName: 'bear-search-notes',
      args: { tag: TAG_ORIGINAL },
    });

    expect(searchResult).toContain('No notes found');
  });
});

describe('bear-delete-tag via MCP Inspector CLI', () => {
  it('removes a tag without affecting the note', async () => {
    const result = callTool({
      toolName: 'bear-delete-tag',
      args: { name: TAG_RENAMED },
    });

    expect(result).toContain('deleted successfully');

    await sleep(PAUSE_AFTER_WRITE_OP);

    // Tag should no longer return results
    const searchResult = callTool({
      toolName: 'bear-search-notes',
      args: { tag: TAG_RENAMED },
    });

    expect(searchResult).toContain('No notes found');

    // The note itself should still exist
    const openResult = callTool({
      toolName: 'bear-open-note',
      args: { id: noteId! },
    });

    expect(openResult).toContain(NOTE_TITLE);
  });
});
