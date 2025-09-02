import createDebug from 'debug';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ERROR_MESSAGES } from './config.js';
import { getNoteContent } from './database.js';
import { buildBearUrl, executeBearXCallbackApi } from './bear-urls.js';

export const logger = {
  debug: createDebug('bear-notes-mcp:debug'),
  info: createDebug('bear-notes-mcp:info'),
  error: createDebug('bear-notes-mcp:error'),
};

// Convert UI_DEBUG_TOGGLE boolean set from UI to DEBUG string for debug package
// MCPB has no way to make this in one step with manifest.json
if (process.env.UI_DEBUG_TOGGLE === 'true') {
  process.env.DEBUG = 'bear-notes-mcp:*';
  logger.debug.enabled = true;
}

// Always enable error and info logs
logger.error.enabled = true;
logger.info.enabled = true;

/**
 * Logs an error message and throws an Error to halt execution.
 * Centralizes error handling to ensure consistent logging before failures.
 *
 * @param message - The error message to log and throw
 * @throws Always throws Error with the provided message
 */
export function logAndThrow(message: string): never {
  logger.error(message);
  throw new Error(message);
}

/**
 * Creates a standardized MCP tool response with consistent formatting.
 * Centralizes response structure to follow DRY principles.
 *
 * @param text - The response text content
 * @returns Formatted CallToolResult for MCP tools
 */
export function createToolResponse(text: string): Pick<CallToolResult, 'content'> {
  return {
    content: [
      {
        type: 'text' as const,
        text,
        annotations: { audience: ['user', 'assistant'] as const },
      },
    ],
  };
}

/**
 * Shared handler for adding text to Bear notes (append or prepend).
 * Consolidates common validation, execution, and response logic.
 *
 * @param mode - Whether to append or prepend text
 * @param params - Note ID, text content, and optional header
 * @returns Formatted response indicating success or failure
 */
export async function handleAddText(
  mode: 'append' | 'prepend',
  { id, text, header }: { id: string; text: string; header?: string | undefined }
): Promise<CallToolResult> {
  const action = mode === 'append' ? 'appended' : 'prepended';
  logger.info(
    `bear-add-text-${mode} called with id: ${id}, text length: ${text.length}, header: ${header || 'none'}`
  );

  if (!id || !id.trim()) {
    throw new Error(ERROR_MESSAGES.MISSING_NOTE_ID);
  }

  if (!text || !text.trim()) {
    throw new Error(ERROR_MESSAGES.MISSING_TEXT_PARAM);
  }

  try {
    const existingNote = getNoteContent(id.trim());

    if (!existingNote) {
      return createToolResponse(`Note with ID '${id}' not found. The note may have been deleted, archived, or the ID may be incorrect.

Use bear-search-notes to find the correct note identifier.`);
    }

    // Strip markdown header syntax from header parameter for Bear API
    const cleanHeader = header?.trim().replace(/^#+\s*/, '');

    const url = buildBearUrl('add-text', {
      id: id.trim(),
      text: text.trim(),
      header: cleanHeader,
      mode,
    });
    logger.debug(`Executing Bear URL: ${url}`);
    await executeBearXCallbackApi(url);

    const responseLines = [`Text ${action} to note "${existingNote.title}" successfully!`, ''];

    responseLines.push(`Text: ${text.trim().length} characters`);

    if (header?.trim()) {
      responseLines.push(`Section: ${header.trim()}`);
    }

    responseLines.push(`Note ID: ${id.trim()}`);

    return createToolResponse(`${responseLines.join('\n')}

The text has been added to your Bear note.`);
  } catch (error) {
    logger.error(`bear-add-text-${mode} failed: ${error}`);
    throw error;
  }
}
