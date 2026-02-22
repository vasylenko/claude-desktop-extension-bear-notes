import { afterAll, describe, expect, it } from 'vitest';

import {
  archiveNote,
  callTool,
  cleanupTestNotes,
  extractNoteBody,
  findNoteId,
  sleep,
  uniqueTitle,
} from './inspector.js';

const TEST_PREFIX = '[Bear-MCP-stest-replace-text]';
const RUN_ID = Date.now();
const PAUSE_AFTER_WRITE_OP = 100; // ms to wait after write operations for Bear to process changes as we don't catch the callback response in these tests to confirm completion

afterAll(() => {
  cleanupTestNotes(TEST_PREFIX);
});

describe('bear-replace-text via MCP Inspector CLI', () => {
  it('replaces full note content', async () => {
    const title = uniqueTitle(TEST_PREFIX, 'Full Replace', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Original body content', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      callTool({
        toolName: 'bear-replace-text',
        args: { id: noteId, scope: 'full-note-body', text: 'Completely new content' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(PAUSE_AFTER_WRITE_OP);

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

  it('replaces only the targeted section under a header', async () => {
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
        toolName: 'bear-replace-text',
        args: { id: noteId, scope: 'section', text: 'Updated details text', header: 'Details' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(PAUSE_AFTER_WRITE_OP);

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

  it('does not duplicate header when replacement text includes it', async () => {
    const title = uniqueTitle(TEST_PREFIX, 'Header Dedup', RUN_ID);
    let noteId: string | undefined;

    const sectionedText = [
      '## Introduction',
      'Intro text',
      '',
      '## Details',
      'Original details',
      '',
      '## Conclusion',
      'Conclusion text',
    ].join('\n');

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: sectionedText, tags: 'system-test' },
      });

      noteId = findNoteId(title);

      // AI agents naturally include the header in replacement text — the server must strip it
      callTool({
        toolName: 'bear-replace-text',
        args: { id: noteId, scope: 'section', text: '## Details\nReplaced details content', header: 'Details' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(PAUSE_AFTER_WRITE_OP);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);
      expect(noteBody).toContain('Replaced details content');
      // Header must appear exactly once — no duplication
      const detailsCount = (noteBody.match(/## Details/g) || []).length;
      expect(detailsCount).toBe(1);
      // Other sections remain untouched
      expect(noteBody).toContain('Intro text');
      expect(noteBody).toContain('Conclusion text');
      expect(noteBody).not.toContain('Original details');
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
        toolName: 'bear-replace-text',
        args: { id: noteId, scope: 'full-note-body', text: 'new content' },
        env: {},
      });

      expect(result).toContain('Content replacement is not enabled');
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
        toolName: 'bear-replace-text',
        args: { id: noteId, scope: 'section', text: 'new content', header: 'NonExistentSection' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      expect(result).toContain('"NonExistentSection" not found');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('replaces section with special characters in header name', async () => {
    const title = uniqueTitle(TEST_PREFIX, 'Special Header', RUN_ID);
    let noteId: string | undefined;

    const sectionedText = [
      '## Overview',
      'Overview text',
      '',
      '## Details (v2)',
      'Original details v2 content',
    ].join('\n');

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: sectionedText, tags: 'system-test' },
      });

      noteId = findNoteId(title);

      // Header contains regex special chars: (, )
      callTool({
        toolName: 'bear-replace-text',
        args: { id: noteId, scope: 'section', text: 'Updated details v2 content', header: 'Details (v2)' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(PAUSE_AFTER_WRITE_OP);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);
      expect(noteBody).toContain('Updated details v2 content');
      expect(noteBody).toContain('Overview text');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('strips markdown syntax from header parameter', async () => {
    const title = uniqueTitle(TEST_PREFIX, 'MD Header', RUN_ID);
    let noteId: string | undefined;

    const sectionedText = [
      '## First',
      'First section text',
      '',
      '## Second',
      'Second section text',
    ].join('\n');

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: sectionedText, tags: 'system-test' },
      });

      noteId = findNoteId(title);

      // LLMs commonly pass headers with markdown prefix — code should strip it
      callTool({
        toolName: 'bear-replace-text',
        args: { id: noteId, scope: 'section', text: 'Replaced via markdown header', header: '## Second' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(PAUSE_AFTER_WRITE_OP);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);
      expect(noteBody).toContain('Replaced via markdown header');
      expect(noteBody).toContain('First section text');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('matches header case-insensitively for validation', async () => {
    const title = uniqueTitle(TEST_PREFIX, 'Case Header', RUN_ID);
    let noteId: string | undefined;

    const sectionedText = ['## My Section', 'Original section text'].join('\n');

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: sectionedText, tags: 'system-test' },
      });

      noteId = findNoteId(title);

      // Validation should pass case-insensitively
      callTool({
        toolName: 'bear-replace-text',
        args: { id: noteId, scope: 'section', text: 'Case-insensitive replace', header: 'my section' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(PAUSE_AFTER_WRITE_OP);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);
      expect(noteBody).toContain('Case-insensitive replace');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('rejects section scope without header', () => {
    const title = uniqueTitle(TEST_PREFIX, 'No Header', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Some content', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      const result = callTool({
        toolName: 'bear-replace-text',
        args: { id: noteId, scope: 'section', text: 'new content' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      expect(result).toContain('scope is "section" but no header was provided');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('rejects body scope with header', () => {
    const title = uniqueTitle(TEST_PREFIX, 'Body + Header', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: '## Section\nSome content', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      const result = callTool({
        toolName: 'bear-replace-text',
        args: { id: noteId, scope: 'full-note-body', text: 'new content', header: 'Section' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      expect(result).toContain('scope is "full-note-body" but a header was provided');
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });

  it('does not duplicate title in full-body replace', async () => {
    const title = uniqueTitle(TEST_PREFIX, 'Title Dedup', RUN_ID);
    let noteId: string | undefined;

    try {
      callTool({
        toolName: 'bear-create-note',
        args: { title, text: 'Original body', tags: 'system-test' },
      });

      noteId = findNoteId(title);

      // AI agents naturally include the title heading — the server must strip it
      callTool({
        toolName: 'bear-replace-text',
        args: { id: noteId, scope: 'full-note-body', text: `# ${title}\nBrand new body content` },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(PAUSE_AFTER_WRITE_OP);

      const openResult = callTool({
        toolName: 'bear-open-note',
        args: { id: noteId },
      });

      const noteBody = extractNoteBody(openResult);
      expect(noteBody).toContain('Brand new body content');
      // Title must appear exactly once — no duplication
      const titleRegex = new RegExp(`# ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      const titleCount = (noteBody.match(titleRegex) || []).length;
      expect(titleCount).toBe(1);
    } finally {
      if (noteId) archiveNote(noteId);
    }
  });
});
