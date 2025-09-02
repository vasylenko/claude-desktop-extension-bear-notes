import { DatabaseSync } from 'node:sqlite';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { BearNote } from './types.js';
import {
  BEAR_DATABASE_PATH,
  CORE_DATA_EPOCH_OFFSET,
  DEFAULT_SEARCH_LIMIT,
  ERROR_MESSAGES,
} from './config.js';
import { logger, logAndThrow } from './utils.js';

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

  // Convert Core Data timestamps to ISO strings
  // Bear stores timestamps in seconds since Core Data epoch (2001-01-01)
  const modificationTimestamp = modificationDate + CORE_DATA_EPOCH_OFFSET;
  const creationTimestamp = creationDate + CORE_DATA_EPOCH_OFFSET;

  const modification_date = new Date(modificationTimestamp * 1000).toISOString();
  const creation_date = new Date(creationTimestamp * 1000).toISOString();

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
 */
export function getNoteContent(identifier: string): BearNote | null {
  logger.info(`getNoteContent called with identifier: ${identifier}`);

  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    logAndThrow('Database error: Invalid note identifier provided');
  }

  const db = openBearDatabase();

  try {
    const query = `
      SELECT ZTITLE as title,
             ZUNIQUEIDENTIFIER as identifier,
             ZCREATIONDATE as creationDate,
             ZMODIFICATIONDATE as modificationDate,
             ZPINNED as pinned,
             ZTEXT as text
      FROM ZSFNOTE 
      WHERE ZUNIQUEIDENTIFIER = ? 
        AND ZARCHIVED = 0 
        AND ZTRASHED = 0 
        AND ZENCRYPTED = 0
    `;

    logger.debug(`Fetching note content for identifier: ${identifier}`);

    // Use parameter binding to prevent SQL injection attacks
    const stmt = db.prepare(query);
    const row = stmt.get(identifier);

    if (!row) {
      logger.info(`Note not found for identifier: ${identifier}`);
      return null;
    }

    const formattedNote = formatBearNote(row as Record<string, unknown>);
    logger.info(`Retrieved note content for: ${formattedNote.title}`);

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
 */
export function searchNotes(searchTerm?: string, tag?: string, limit?: number): BearNote[] {
  logger.info(
    `searchNotes called with term: "${searchTerm || 'none'}", tag: "${tag || 'none'}", limit: ${limit || DEFAULT_SEARCH_LIMIT}`
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
    let query = `
      SELECT ZTITLE as title,
             ZUNIQUEIDENTIFIER as identifier,
             ZCREATIONDATE as creationDate,
             ZMODIFICATIONDATE as modificationDate
      FROM ZSFNOTE 
      WHERE ZARCHIVED = 0 
        AND ZTRASHED = 0 
        AND ZENCRYPTED = 0`;

    const queryParams: string[] = [];

    // Add search term filtering (search in title and text)
    if (hasSearchTerm) {
      query += ' AND (ZTITLE LIKE ? OR ZTEXT LIKE ?)';
      const searchPattern = `%${searchTerm.trim()}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    // Add tag filtering
    if (hasTag) {
      query += ' AND ZTEXT LIKE ?';
      const tagPattern = `%#${tag.trim()}%`;
      queryParams.push(tagPattern);
    }

    query += ' ORDER BY ZMODIFICATIONDATE DESC LIMIT ?';
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
