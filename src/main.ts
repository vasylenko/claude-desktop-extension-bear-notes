#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { APP_VERSION, ERROR_MESSAGES } from './config.js';
import { createToolResponse, handleAddText, logger } from './utils.js';
import { getNoteContent, searchNotes } from './database.js';
import { buildBearUrl, executeBearXCallbackApi } from './bear-urls.js';

const server = new McpServer({
  name: 'bear-notes-mcp',
  version: APP_VERSION,
});

server.registerTool(
  'bear-open-note',
  {
    title: 'Open Bear Note',
    description:
      'Read the full text of a Bear note. Use this after searching to view complete note content including all text, formatting, and metadata.',
    inputSchema: {
      identifier: z.string().describe('Exact note identifier (ID) obtained from bear-search-notes'),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ identifier }): Promise<CallToolResult> => {
    logger.info(`bear-open-note called with identifier: ${identifier}`);

    if (!identifier || !identifier.trim()) {
      throw new Error(ERROR_MESSAGES.MISSING_NOTE_ID);
    }

    try {
      const noteWithContent = getNoteContent(identifier.trim());

      if (!noteWithContent) {
        return createToolResponse(`Note with ID '${identifier}' not found. The note may have been deleted, archived, or the ID may be incorrect.

Use bear-search-notes to find the correct note identifier.`);
      }

      const noteInfo = [
        `**${noteWithContent.title}**`,
        `Modified: ${noteWithContent.modification_date}`,
        `ID: ${noteWithContent.identifier}`,
      ];

      const noteText = noteWithContent.text || '*This note appears to be empty.*';

      return createToolResponse(`${noteInfo.join('\n')}

---

${noteText}`);
    } catch (error) {
      logger.error(`bear-open-note failed: ${error}`);
      throw error;
    }
  }
);

server.registerTool(
  'bear-create-note',
  {
    title: 'Create New Note',
    description:
      'Create a new note in your Bear library with optional title, content, and tags. The note will be immediately available in Bear app.',
    inputSchema: {
      title: z
        .string()
        .optional()
        .describe('Note title, e.g., "Meeting Notes" or "Research Ideas"'),
      text: z.string().optional().describe('Note content in markdown format'),
      tags: z.string().optional().describe('Tags separated by commas, e.g., "work,project,urgent"'),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async ({ title, text, tags }): Promise<CallToolResult> => {
    logger.debug(
      `bear-create-note called with title: ${title ? '"' + title + '"' : 'none'}, text length: ${text ? text.length : 0}, tags: ${tags || 'none'}`
    );

    try {
      const url = buildBearUrl('create', { title, text, tags });

      await executeBearXCallbackApi(url);

      const responseLines: string[] = ['Bear note created successfully!', ''];

      if (title?.trim()) {
        responseLines.push(`Title: "${title.trim()}"`);
      }

      if (text?.trim()) {
        responseLines.push(`Content: ${text.trim().length} characters`);
      }

      if (tags?.trim()) {
        responseLines.push(`Tags: ${tags.trim()}`);
      }

      const hasContent = title?.trim() || text?.trim() || tags?.trim();
      const finalMessage = hasContent ? responseLines.join('\n') : 'Empty note created';

      return createToolResponse(`${finalMessage}

The note has been added to your Bear Notes library.`);
    } catch (error) {
      logger.error(`bear-create-note failed: ${error}`);
      throw error;
    }
  }
);

server.registerTool(
  'bear-search-notes',
  {
    title: 'Find Bear Notes',
    description:
      'Find notes in your Bear library by searching text content or filtering by tags. Returns a list with titles and IDs - use "Open Bear Note" to read full content.',
    inputSchema: {
      term: z.string().optional().describe('Text to search for in note titles and content'),
      tag: z.string().optional().describe('Tag to filter notes by (without # symbol)'),
      limit: z.number().optional().describe('Maximum number of results to return (default: 50)'),
      includeFiles: z
        .boolean()
        .optional()
        .describe(
          'Search within text extracted from attached images and PDF files via OCR (default: false)'
        ),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ term, tag, limit, includeFiles }): Promise<CallToolResult> => {
    logger.info(
      `bear-search-notes called with term: "${term || 'none'}", tag: "${tag || 'none'}", limit: ${limit || 'default'}, includeFiles: ${includeFiles || false}`
    );

    try {
      const notes = searchNotes(term, tag, limit, includeFiles);

      if (notes.length === 0) {
        const searchCriteria = [];
        if (term?.trim()) searchCriteria.push(`term "${term.trim()}"`);
        if (tag?.trim()) searchCriteria.push(`tag "${tag.trim()}"`);

        return createToolResponse(`No notes found matching ${searchCriteria.join(' and ')}.

Try different search terms or check if notes exist in Bear Notes.`);
      }

      // Format results as list with key info
      const resultLines = [`Found ${notes.length} note${notes.length === 1 ? '' : 's'}:`, ''];

      notes.forEach((note, index) => {
        const noteTitle = note.title || 'Untitled';
        const modifiedDate = new Date(note.modification_date).toLocaleDateString();

        resultLines.push(`${index + 1}. **${noteTitle}**`);
        resultLines.push(`   Modified: ${modifiedDate}`);
        resultLines.push(`   ID: ${note.identifier}`);
        resultLines.push('');
      });

      resultLines.push('Use bear-open-note with an ID to read the full content of any note.');

      return createToolResponse(resultLines.join('\n'));
    } catch (error) {
      logger.error(`bear-search-notes failed: ${error}`);
      throw error;
    }
  }
);

server.registerTool(
  'bear-add-text-append',
  {
    title: 'Add Text to Note',
    description:
      'Add text to the end of an existing Bear note or to a specific section. Use "Find Bear Notes" first to get the note ID.',
    inputSchema: {
      id: z.string().describe('Exact note identifier (ID) obtained from bear-search-notes'),
      text: z.string().describe('Text to append to the note'),
      header: z.string().optional().describe('Optional header to append text to specific section'),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async ({ id, text, header }): Promise<CallToolResult> => {
    return handleAddText('append', { id, text, header });
  }
);

server.registerTool(
  'bear-add-text-prepend',
  {
    title: 'Insert Text at Start',
    description:
      'Add text to the beginning of an existing Bear note or section. Use "Find Bear Notes" first to get the note ID.',
    inputSchema: {
      id: z.string().describe('Exact note identifier (ID) obtained from bear-search-notes'),
      text: z.string().describe('Text to prepend to the note'),
      header: z.string().optional().describe('Optional header to prepend text to specific section'),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async ({ id, text, header }): Promise<CallToolResult> => {
    return handleAddText('prepend', { id, text, header });
  }
);

async function main(): Promise<void> {
  const debugMode = process.argv.includes('--debug');

  if (debugMode) {
    logger.info('Starting Bear Notes MCP Server...');
    logger.info(`Node.js version: ${process.version}`);
    logger.info(`App version: ${APP_VERSION}`);
  }

  // Handle process errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Bear Notes MCP Server connected and ready');
}

main().catch((error) => {
  logger.error('Server startup failed:', error);
  process.exit(1);
});
