import { DatabaseSync } from 'node:sqlite';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import type { BearNote } from './types.js';
import {
  BEAR_DATABASE_PATH,
  DEFAULT_SEARCH_LIMIT,
  ERROR_MESSAGES,
} from './config.js';
import { logAndThrow, logger, convertCoreDataTimestamp } from './utils.js';

function openBearDatabase(): DatabaseSync {
  const databasePath = getBearDatabasePath();
  logger.info(`Opening Bear database at: ${databasePath}`);

  try {
    const db = new DatabaseSync(databasePath);

    logger.debug('Bear database opened successfully');
    return db;
  } catch (error) {
    logger.error(`Failed to open Bear database: ${error}`);
    logAndThrow(
      `Database error: Failed to open Bear database: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function formatBearNote(row: Record<string, unknown>): BearNote {
  const title = (row.title as string) || 'Untitled';
  const identifier = row.identifier as string;
  const modificationDate = row.modificationDate as number;
  const creationDate = row.creationDate as number;
  const pinned = row.pinned as number | undefined;
  const text = row.text as string | undefined;

  if (!identifier) {
    logAndThrow('Database error: Note identifier is missing from database row');
  }
  if (typeof modificationDate !== 'number' || typeof creationDate !== 'number') {
    logAndThrow('Database error: Note date fields are invalid in database row');
  }

  const modification_date = convertCoreDataTimestamp(modificationDate);
  const creation_date = convertCoreDataTimestamp(creationDate);

  // Bear stores pinned as integer; API expects string literal (only needed when pinned is queried)
  const pin: 'yes' | 'no' = pinned ? 'yes' : 'no';

  return {
    title,
    identifier,
    modification_date,
    creation_date,
    pin,
    ...(text !== undefined && { text }),
  };
}

function getBearDatabasePath(): string {
  // Environment override for testing
  const envPath = process.env.BEAR_DB_PATH;
  if (envPath) {
    logger.debug(`Using environment override database path: ${envPath}`);
    return envPath;
  }

  const defaultPath = join(homedir(), BEAR_DATABASE_PATH);

  if (!existsSync(defaultPath)) {
    logger.error(`Bear database not found at: ${defaultPath}`);
    logAndThrow(`Database error: ${ERROR_MESSAGES.BEAR_DATABASE_NOT_FOUND}`);
  }

  logger.debug(`Using default Bear database path: ${defaultPath}`);
  return defaultPath;
}

/**
 * Retrieves a Bear note with its full content from the database.
 *
 * @param identifier - The unique identifier of the Bear note
 * @returns The note with content, or null if not found
 * @throws Error if database access fails or identifier is invalid
 * Note: Always includes OCR'd text from attached images and PDFs with clear labeling
 */
export function getNoteContent(identifier: string): BearNote | null {
  logger.info(`getNoteContent called with identifier: ${identifier}, includeFiles: always`);

  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    logAndThrow('Database error: Invalid note identifier provided');
  }

  const db = openBearDatabase();

  try {
    logger.debug(`Fetching the note content from the database, note identifier: ${identifier}`);

    // Query with file content - always includes OCR'd text from attached files with clear labeling
    const query = `
      SELECT note.ZTITLE as title,
             note.ZUNIQUEIDENTIFIER as identifier,
             note.ZCREATIONDATE as creationDate,
             note.ZMODIFICATIONDATE as modificationDate,
             note.ZPINNED as pinned,
             note.ZTEXT as text,
             f.ZFILENAME as filename,
             f.ZSEARCHTEXT as fileContent
      FROM ZSFNOTE note
      LEFT JOIN ZSFNOTEFILE f ON f.ZNOTE = note.Z_PK
      WHERE note.ZUNIQUEIDENTIFIER = ? 
        AND note.ZARCHIVED = 0 
        AND note.ZTRASHED = 0 
        AND note.ZENCRYPTED = 0
    `;
    const stmt = db.prepare(query);
    const rows = stmt.all(identifier);
    if (!rows || rows.length === 0) {
      logger.info(`Note not found for identifier: ${identifier}`);
      return null;
    }

    // Process multiple rows (note + files) into single note object
    const firstRow = rows[0] as Record<string, unknown>;
    const formattedNote = formatBearNote(firstRow);

    // Collect file content from all rows with clear source labeling
    const fileContents: string[] = [];
    for (const row of rows) {
      const rowData = row as Record<string, unknown>;
      const filename = rowData.filename as string;
      const fileContent = rowData.fileContent as string;

      if (filename && fileContent && fileContent.trim()) {
        fileContents.push(`##${filename}\n\n${fileContent.trim()}`);
      }
    }

    // Always append file content section, even if empty, to show structure
    const originalText = formattedNote.text || '';
    const filesSectionHeader = '\n\n---\n\n#Attached Files\n\n';
    if (fileContents.length > 0) {
      const fileSection = `${filesSectionHeader}${fileContents.join('\n\n---\n\n')}`;
      formattedNote.text = originalText + fileSection;
    } else {
      // Add a note that no files are attached for clarity
      formattedNote.text = originalText + `${filesSectionHeader}*No files attached to this note.*`;
    }

    logger.info(
      `Retrieved note content with ${fileContents.length} attached files for: ${formattedNote.title}`
    );
    return formattedNote;
  } catch (error) {
    logger.error(`SQLite query failed: ${error}`);
    logAndThrow(
      `Database error: Failed to retrieve note content: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    try {
      db.close();
      logger.debug('Database connection closed');
    } catch (closeError) {
      logger.error(`Failed to close database connection: ${closeError}`);
    }
  }
  return null;
}

/**
 * Searches Bear notes by content or tags with optional filtering.
 * Returns a list of notes without full content for performance.
 *
 * @param searchTerm - Text to search for in note titles and content (optional)
 * @param tag - Tag to filter notes by (optional)
 * @param limit - Maximum number of results to return (default from config)
 * @returns Array of matching notes without full text content
 * @throws Error if database access fails or no search criteria provided
 * Note: Always searches within text extracted from attached images and PDF files via OCR for comprehensive results
 */
export function searchNotes(searchTerm?: string, tag?: string, limit?: number): BearNote[] {
  logger.info(
    `searchNotes called with term: "${searchTerm || 'none'}", tag: "${tag || 'none'}", limit: ${limit || DEFAULT_SEARCH_LIMIT}, includeFiles: always`
  );

  // Validate search parameters - at least one must be provided
  const hasSearchTerm = searchTerm && typeof searchTerm === 'string' && searchTerm.trim();
  const hasTag = tag && typeof tag === 'string' && tag.trim();

  if (!hasSearchTerm && !hasTag) {
    logAndThrow('Search error: Please provide either a search term or a tag to search for notes');
  }

  const db = openBearDatabase();
  const queryLimit = limit || DEFAULT_SEARCH_LIMIT;

  try {
    let query: string;
    const queryParams: string[] = [];

    // Query with file search - uses LEFT JOIN to include OCR'd content for comprehensive search
    query = `
      SELECT DISTINCT note.ZTITLE as title,
             note.ZUNIQUEIDENTIFIER as identifier,
             note.ZCREATIONDATE as creationDate,
             note.ZMODIFICATIONDATE as modificationDate
      FROM ZSFNOTE note
      LEFT JOIN ZSFNOTEFILE f ON f.ZNOTE = note.Z_PK
      WHERE note.ZARCHIVED = 0 
        AND note.ZTRASHED = 0 
        AND note.ZENCRYPTED = 0`;

    // Add search term filtering
    if (hasSearchTerm) {
      const searchPattern = `%${searchTerm.trim()}%`;
      // Search in note title, text, and file OCR content
      query += ' AND (note.ZTITLE LIKE ? OR note.ZTEXT LIKE ? OR f.ZSEARCHTEXT LIKE ?)';
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Add tag filtering
    if (hasTag) {
      const tagPattern = `%#${tag.trim()}%`;
      query += ' AND note.ZTEXT LIKE ?';
      queryParams.push(tagPattern);
    }

    // Add ordering and limit
    query += ' ORDER BY note.ZMODIFICATIONDATE DESC LIMIT ?';
    queryParams.push(queryLimit.toString());

    logger.debug(`Executing search query with ${queryParams.length} parameters`);

    // Use parameter binding to prevent SQL injection attacks
    const stmt = db.prepare(query);
    const rows = stmt.all(...queryParams);

    if (!rows || rows.length === 0) {
      logger.info('No notes found matching search criteria');
      return [];
    }

    const notes = rows.map((row) => formatBearNote(row as Record<string, unknown>));
    logger.info(`Found ${notes.length} notes matching search criteria`);

    return notes;
  } catch (error) {
    logAndThrow(
      `SQLite search query failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    try {
      db.close();
      logger.debug('Database connection closed');
    } catch (closeError) {
      logger.error(`Failed to close database connection: ${closeError}`);
    }
  }

  return [];
}
