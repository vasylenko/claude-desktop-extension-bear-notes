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
        args: { id: noteId, text: 'Completely new content' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(500);

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
        args: { id: noteId, text: 'Updated details text', header: 'Details' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(500);

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
        toolName: 'bear-replace-text',
        args: { id: noteId, text: 'new content' },
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
        args: { id: noteId, text: 'new content', header: 'NonExistentSection' },
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
        args: { id: noteId, text: 'Updated details v2 content', header: 'Details (v2)' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(500);

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
        args: { id: noteId, text: 'Replaced via markdown header', header: '## Second' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(500);

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
        args: { id: noteId, text: 'Case-insensitive replace', header: 'my section' },
        env: { UI_ENABLE_CONTENT_REPLACEMENT: 'true' },
      });

      await sleep(500);

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
});
