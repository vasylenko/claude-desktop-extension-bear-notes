import createDebug from 'debug';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { CORE_DATA_EPOCH_OFFSET, ERROR_MESSAGES } from './config.js';
import { getNoteContent } from './notes.js';
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
 * Cleans base64 string by removing whitespace/newlines added by base64 command.
 * URLSearchParams in buildBearUrl will handle URL encoding of special characters.
 *
 * @param base64String - Raw base64 string (may contain whitespace/newlines)
 * @returns Cleaned base64 string without whitespace
 */
export function cleanBase64(base64String: string): string {
  // Remove all whitespace/newlines from base64 (base64 command adds line breaks)
  return base64String.trim().replace(/\s+/g, '');
}

/**
 * Converts Bear's Core Data timestamp to ISO string format.
 * Bear stores timestamps in seconds since Core Data epoch (2001-01-01).
 *
 * @param coreDataTimestamp - Timestamp in seconds since Core Data epoch
 * @returns ISO string representation of the timestamp
 */
export function convertCoreDataTimestamp(coreDataTimestamp: number): string {
  const unixTimestamp = coreDataTimestamp + CORE_DATA_EPOCH_OFFSET;
  return new Date(unixTimestamp * 1000).toISOString();
}

/**
 * Converts a JavaScript Date object to Bear's Core Data timestamp format.
 * Core Data timestamps are in seconds since 2001-01-01 00:00:00 UTC.
 *
 * @param date - JavaScript Date object
 * @returns Core Data timestamp in seconds
 */
export function convertDateToCoreDataTimestamp(date: Date): number {
  const unixTimestamp = Math.floor(date.getTime() / 1000);
  return unixTimestamp - CORE_DATA_EPOCH_OFFSET;
}

/**
 * Parses a date string and returns a JavaScript Date object.
 * Supports relative dates ("today", "yesterday", "last week", "last month") and ISO date strings.
 *
 * @param dateString - Date string to parse (e.g., "today", "2024-01-15", "last week")
 * @returns Parsed Date object
 * @throws Error if the date string is invalid
 */
export function parseDateString(dateString: string): Date {
  const lowerDateString = dateString.trim().toLowerCase();
  const now = new Date();

  // Handle relative dates to provide user-friendly natural language date input
  switch (lowerDateString) {
    case 'today': {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return today;
    }
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return yesterday;
    }
    case 'last week':
    case 'week ago': {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);
      return lastWeek;
    }
    case 'last month':
    case 'month ago':
    case 'start of last month': {
      // Calculate the first day of last month; month arithmetic handles year transitions correctly via JavaScript Date constructor
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      lastMonth.setHours(0, 0, 0, 0);
      return lastMonth;
    }
    case 'end of last month': {
      // Calculate the last day of last month; day 0 of current month equals last day of previous month
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      endOfLastMonth.setHours(23, 59, 59, 999);
      return endOfLastMonth;
    }
    default: {
      // Try parsing as ISO date or other standard formats as fallback for user-provided explicit dates
      const parsed = new Date(dateString);
      if (isNaN(parsed.getTime())) {
        logAndThrow(
          `Invalid date format: "${dateString}". Use ISO format (YYYY-MM-DD) or relative dates (today, yesterday, last week, last month, start of last month, end of last month).`
        );
      }
      return parsed;
    }
  }
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

  if (!id) {
    throw new Error(ERROR_MESSAGES.MISSING_NOTE_ID);
  }

  if (!text) {
    throw new Error(ERROR_MESSAGES.MISSING_TEXT_PARAM);
  }

  try {
    const existingNote = getNoteContent(id);

    if (!existingNote) {
      return createToolResponse(`Note with ID '${id}' not found. The note may have been deleted, archived, or the ID may be incorrect.

Use bear-search-notes to find the correct note identifier.`);
    }

    // Strip markdown header syntax from header parameter for Bear API
    const cleanHeader = header?.replace(/^#+\s*/, '');

    const url = buildBearUrl('add-text', {
      id,
      text,
      header: cleanHeader,
      mode,
    });
    logger.debug(`Executing Bear URL: ${url}`);
    await executeBearXCallbackApi(url);

    const responseLines = [`Text ${action} to note "${existingNote.title}" successfully!`, ''];

    responseLines.push(`Text: ${text.length} characters`);

    if (header) {
      responseLines.push(`Section: ${header}`);
    }

    responseLines.push(`Note ID: ${id}`);

    return createToolResponse(`${responseLines.join('\n')}

The text has been added to your Bear note.`);
  } catch (error) {
    logger.error(`bear-add-text-${mode} failed: ${error}`);
    throw error;
  }
}
