#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { APP_VERSION, ERROR_MESSAGES } from './config.js';
import { cleanBase64, createToolResponse, handleAddText, logger } from './utils.js';
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
      'Read the full text content of a Bear note from your library. Always includes text extracted from attached images and PDFs (aka OCR search) with clear labeling.',
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
    logger.info(`bear-open-note called with identifier: ${identifier}, includeFiles: always`);

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
      'Find notes in your Bear library by searching text content or filtering by tags. Always searches within attached images and PDF files via OCR. Returns a list with titles and IDs - use "Open Bear Note" to read full content.',
    inputSchema: {
      term: z.string().optional().describe('Text to search for in note titles and content'),
      tag: z.string().optional().describe('Tag to filter notes by (without # symbol)'),
      limit: z.number().optional().describe('Maximum number of results to return (default: 50)'),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ term, tag, limit }): Promise<CallToolResult> => {
    logger.info(
      `bear-search-notes called with term: "${term || 'none'}", tag: "${tag || 'none'}", limit: ${limit || 'default'}, includeFiles: always`
    );

    try {
      const notes = searchNotes(term, tag, limit);

      if (notes.length === 0) {
        const searchCriteria = [];
        if (term?.trim()) searchCriteria.push(`term "${term.trim()}"`);
        if (tag?.trim()) searchCriteria.push(`tag "${tag.trim()}"`);

        return createToolResponse(`No notes found matching ${searchCriteria.join(' and ')}.

Try different search terms or check if notes exist in Bear Notes.`);
      }

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

server.registerTool(
  'bear-add-file',
  {
    title: 'Add File to Note',
    description:
      'Attach a file to an existing Bear note. Encode the file to base64 using shell commands (e.g., base64 /path/to/file.xlsx) and provide the encoded content. Use "Find Bear Notes" first to get the note ID.',
    inputSchema: {
      base64_content: z.string().describe('Base64-encoded file content'),
      filename: z.string().describe('Filename with extension (e.g., budget.xlsx, report.pdf)'),
      id: z
        .string()
        .optional()
        .describe('Exact note identifier (ID) obtained from bear-search-notes'),
      title: z.string().optional().describe('Note title if ID is not available'),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async ({ base64_content, filename, id, title }): Promise<CallToolResult> => {
    logger.info(
      `bear-add-file called with base64_content: ${base64_content ? 'provided' : 'none'}, filename: ${filename || 'none'}, id: ${id || 'none'}, title: ${title || 'none'}`
    );

    if (!base64_content || !base64_content.trim()) {
      throw new Error('base64_content is required');
    }

    if (!filename || !filename.trim()) {
      throw new Error('filename is required');
    }

    if (!id && !title) {
      throw new Error(
        'Either note ID or title is required. Use bear-search-notes to find the note ID.'
      );
    }

    try {
      // Clean base64 string (remove whitespace/newlines from base64 command output)
      const cleanedBase64 = cleanBase64(base64_content);

      // Verify note exists if ID provided
      if (id) {
        const existingNote = getNoteContent(id.trim());
        if (!existingNote) {
          return createToolResponse(`Note with ID '${id}' not found. The note may have been deleted, archived, or the ID may be incorrect.

Use bear-search-notes to find the correct note identifier.`);
        }
      }

      const url = buildBearUrl('add-file', {
        id: id?.trim(),
        title: title?.trim(),
        file: cleanedBase64,
        filename: filename.trim(),
        mode: 'append',
      });

      logger.debug(`Executing Bear add-file URL for: ${filename.trim()}`);
      await executeBearXCallbackApi(url);

      const noteIdentifier = id ? `Note ID: ${id.trim()}` : `Note title: "${title!.trim()}"`;

      return createToolResponse(`File "${filename.trim()}" added successfully!

${noteIdentifier}

The file has been attached to your Bear note.`);
    } catch (error) {
      logger.error(`bear-add-file failed: ${error}`);
      throw error;
    }
  }
);

async function main(): Promise<void> {
  logger.info(`Bear Notes MCP Server initializing... Version: ${APP_VERSION}`);
  logger.debug(`Debug logs enabled: ${logger.debug.enabled}`);
  logger.debug(`Node.js version: ${process.version}`);
  logger.debug(`App version: ${APP_VERSION}`);

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
