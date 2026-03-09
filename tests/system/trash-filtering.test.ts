import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  callTool,
  cleanupTestNotes,
  findNoteId,
  trashNote,
  tryExtractNoteId,
  uniqueTitle,
} from './inspector.js';

const TEST_PREFIX = '[Bear-MCP-stest-trash-filter]';
const RUN_ID = Date.now();

const TAG = `stest77-${RUN_ID}`;

function title(label: string): string {
  return uniqueTitle(TEST_PREFIX, label, RUN_ID);
}

const TITLE = title('TrashTag');

let noteId: string;

beforeAll(() => {
  callTool({ toolName: 'bear-create-note', args: { title: TITLE, tags: TAG } });
  noteId = findNoteId(TITLE);
});

afterAll(() => {
  cleanupTestNotes(TEST_PREFIX);
});

describe('trash filtering in tag listing', () => {
  it('tag appears in bear-list-tags before trashing', () => {
    const result = callTool({ toolName: 'bear-list-tags' });
    expect(result).toContain(TAG);
  });

  it('trashed note tag disappears from bear-list-tags', () => {
    trashNote(noteId);

    const result = callTool({ toolName: 'bear-list-tags' });
    expect(result).not.toContain(TAG);
  });

  it('trashed note is excluded from bear-search-notes', () => {
    const result = callTool({ toolName: 'bear-search-notes', args: { term: TITLE } });
    expect(tryExtractNoteId(result)).toBeNull();
  });
});
