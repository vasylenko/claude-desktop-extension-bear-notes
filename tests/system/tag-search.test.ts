import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { callTool, extractNoteId } from './inspector.js';

const TEST_PREFIX = '[Bear-MCP-stest-tag-search]';
const RUN_ID = Date.now();

// Unique tag names scoped to this test run to avoid collisions with real data.
// TAG_BASE is the "parent" tag; TAG_NESTED is a child; TAG_SIMILAR has the parent as a prefix.
const TAG_BASE = `stest67-${RUN_ID}`;
const TAG_NESTED = `${TAG_BASE}/child`;
const TAG_SIMILAR = `${TAG_BASE}plus`;

function uniqueTitle(label: string): string {
  return `${TEST_PREFIX} ${label} ${RUN_ID}`;
}

/** Archive a note by ID, swallowing errors during cleanup. */
function archiveNote(id: string): void {
  try {
    callTool({ toolName: 'bear-archive-note', args: { id } });
  } catch {
    // Best-effort cleanup
  }
}

// Titles are deterministic per run — used to verify search result presence/absence.
const TITLE_EXACT = uniqueTitle('Exact');
const TITLE_NESTED = uniqueTitle('Nested');
const TITLE_SIMILAR = uniqueTitle('Similar');

const noteIds: string[] = [];

beforeAll(() => {
  // Create three notes with distinct tag relationships:
  // "Exact" — tagged with TAG_BASE only
  // "Nested" — tagged with TAG_NESTED (child of TAG_BASE)
  // "Similar" — tagged with TAG_SIMILAR (prefix overlap, NOT a child)
  for (const { title, tag } of [
    { title: TITLE_EXACT, tag: TAG_BASE },
    { title: TITLE_NESTED, tag: TAG_NESTED },
    { title: TITLE_SIMILAR, tag: TAG_SIMILAR },
  ]) {
    callTool({ toolName: 'bear-create-note', args: { title, tags: tag } });
    const searchResult = callTool({
      toolName: 'bear-search-notes',
      args: { term: title },
    });
    noteIds.push(extractNoteId(searchResult));
  }
});

afterAll(() => {
  // Archive notes created during this run
  for (const id of noteIds) {
    archiveNote(id);
  }

  // Safety sweep: archive any stray test notes from interrupted runs
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

describe('tag search via MCP Inspector CLI', () => {
  it('exact tag returns the matching note', () => {
    const result = callTool({
      toolName: 'bear-search-notes',
      args: { tag: TAG_BASE },
    });

    expect(result).toContain(TITLE_EXACT);
  });

  it('parent tag search includes notes with nested child tags', () => {
    const result = callTool({
      toolName: 'bear-search-notes',
      args: { tag: TAG_BASE },
    });

    expect(result).toContain(TITLE_NESTED);
  });

  it('parent tag search excludes notes whose tag merely shares a prefix', () => {
    const result = callTool({
      toolName: 'bear-search-notes',
      args: { tag: TAG_BASE },
    });

    // TAG_SIMILAR ("stest67-...plus") is a different tag, not a child of TAG_BASE
    expect(result).not.toContain(TITLE_SIMILAR);
  });

  it('nested tag search returns only the nested-tagged note', () => {
    const result = callTool({
      toolName: 'bear-search-notes',
      args: { tag: TAG_NESTED },
    });

    expect(result).toContain(TITLE_NESTED);
    expect(result).not.toContain(TITLE_EXACT);
    expect(result).not.toContain(TITLE_SIMILAR);
  });

  it('similar tag search returns only the similar-tagged note', () => {
    const result = callTool({
      toolName: 'bear-search-notes',
      args: { tag: TAG_SIMILAR },
    });

    expect(result).toContain(TITLE_SIMILAR);
    expect(result).not.toContain(TITLE_EXACT);
    expect(result).not.toContain(TITLE_NESTED);
  });
});
