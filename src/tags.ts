import type { BearNote, BearTag } from './types.js';
import { convertCoreDataTimestamp, logAndThrow, logger } from './utils.js';
import { openBearDatabase } from './database.js';

/**
 * Decodes and normalizes Bear tag names.
 * - Replaces '+' with spaces (Bear's URL encoding)
 * - Converts to lowercase (matches Bear UI behavior)
 * - Trims whitespace
 */
function decodeTagName(encodedName: string): string {
  return encodedName.replace(/\+/g, ' ').trim().toLowerCase();
}

/**
 * Extracts the display name (leaf) from a full tag path.
 * For "career/content/blog" returns "blog", for "career" returns "career".
 */
function getTagDisplayName(fullPath: string): string {
  const parts = fullPath.split('/');
  return parts[parts.length - 1];
}

/**
 * Builds a hierarchical tree from a flat list of tags.
 * Tags with paths like "career/content" become children of "career".
 * Tags with 0 notes are excluded (matches Bear UI behavior).
 */
function buildTagHierarchy(
  flatTags: Array<{ name: string; displayName: string; noteCount: number; isRoot: boolean }>
): BearTag[] {
  // Filter out tags with no notes (hidden in Bear UI)
  const activeTags = flatTags.filter((t) => t.noteCount > 0);

  const tagMap = new Map<string, BearTag>();

  // Two-pass approach: first create nodes, then link parent-child relationships
  for (const tag of activeTags) {
    tagMap.set(tag.name, {
      name: tag.name,
      displayName: tag.displayName,
      noteCount: tag.noteCount,
      children: [],
    });
  }

  const roots: BearTag[] = [];

  // Build parent-child relationships
  for (const tag of activeTags) {
    const tagNode = tagMap.get(tag.name)!;

    if (tag.isRoot) {
      roots.push(tagNode);
    } else {
      // Subtags use path notation (e.g., "career/content"), so extract parent path
      const lastSlash = tag.name.lastIndexOf('/');
      if (lastSlash > 0) {
        const parentName = tag.name.substring(0, lastSlash);
        const parent = tagMap.get(parentName);
        if (parent) {
          parent.children.push(tagNode);
        } else {
          // Orphan subtag - parent has 0 notes or doesn't exist, treat as root
          roots.push(tagNode);
        }
      }
    }
  }

  // Sort children alphabetically at each level
  const sortChildren = (tags: BearTag[]): void => {
    tags.sort((a, b) => a.displayName.localeCompare(b.displayName));
    for (const tag of tags) {
      sortChildren(tag.children);
    }
  };

  sortChildren(roots);

  return roots;
}

/**
 * Retrieves all tags from Bear database as a hierarchical tree.
 * Each tag includes note count and nested children.
 *
 * @returns Object with tags array (tree structure) and total count
 */
export function listTags(): { tags: BearTag[]; totalCount: number } {
  logger.info('listTags called');

  const db = openBearDatabase();

  try {
    const query = `
      SELECT t.ZTITLE as name,
             t.ZISROOT as isRoot,
             COUNT(nt.Z_5NOTES) as noteCount
      FROM ZSFNOTETAG t
      LEFT JOIN Z_5TAGS nt ON nt.Z_13TAGS = t.Z_PK
      GROUP BY t.Z_PK
      ORDER BY t.ZTITLE
    `;

    const stmt = db.prepare(query);
    const rows = stmt.all() as Array<{ name: string; isRoot: number; noteCount: number }>;

    if (!rows || rows.length === 0) {
      logger.info('No tags found in database');
      return { tags: [], totalCount: 0 };
    }

    // Transform rows: decode names and extract display names
    const flatTags = rows.map((row) => {
      const decodedName = decodeTagName(row.name);
      return {
        name: decodedName,
        displayName: getTagDisplayName(decodedName),
        noteCount: row.noteCount,
        isRoot: row.isRoot === 1,
      };
    });

    const hierarchy = buildTagHierarchy(flatTags);

    logger.info(`Retrieved ${rows.length} tags, ${hierarchy.length} root tags`);
    return { tags: hierarchy, totalCount: rows.length };
  } catch (error) {
    logAndThrow(
      `Database error: Failed to retrieve tags: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    try {
      db.close();
      logger.debug('Database connection closed');
    } catch (closeError) {
      logger.error(`Failed to close database connection: ${closeError}`);
    }
  }

  return { tags: [], totalCount: 0 };
}

/**
 * Finds notes that have no tags assigned.
 *
 * @param limit - Maximum number of results (default: 50)
 * @returns Object with untagged notes and total count (before limit applied)
 */
export function findUntaggedNotes(limit: number = 50): { notes: BearNote[]; totalCount: number } {
  logger.info(`findUntaggedNotes called with limit: ${limit}`);

  const db = openBearDatabase();

  try {
    // COUNT(*) OVER() calculates total matching rows BEFORE LIMIT is applied
    const query = `
      SELECT ZTITLE as title,
             ZUNIQUEIDENTIFIER as identifier,
             ZCREATIONDATE as creationDate,
             ZMODIFICATIONDATE as modificationDate,
             COUNT(*) OVER() as totalCount
      FROM ZSFNOTE
      WHERE ZARCHIVED = 0 AND ZTRASHED = 0 AND ZENCRYPTED = 0
        AND Z_PK NOT IN (SELECT Z_5NOTES FROM Z_5TAGS)
      ORDER BY ZMODIFICATIONDATE DESC
      LIMIT ?
    `;

    const stmt = db.prepare(query);
    const rows = stmt.all(limit) as Array<{
      title: string;
      identifier: string;
      creationDate: number;
      modificationDate: number;
      totalCount: number;
    }>;

    if (rows.length === 0) {
      logger.info('No untagged notes found');
      return { notes: [], totalCount: 0 };
    }

    // Extract totalCount from first row (window function adds same value to all rows)
    const totalCount = rows[0].totalCount || rows.length;

    const notes: BearNote[] = rows.map((row) => ({
      title: row.title || 'Untitled',
      identifier: row.identifier,
      creation_date: convertCoreDataTimestamp(row.creationDate),
      modification_date: convertCoreDataTimestamp(row.modificationDate),
      pin: 'no' as const,
    }));

    logger.info(`Found ${notes.length} untagged notes (${totalCount} total)`);
    return { notes, totalCount };
  } catch (error) {
    logAndThrow(
      `Database error: Failed to find untagged notes: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    try {
      db.close();
      logger.debug('Database connection closed');
    } catch (closeError) {
      logger.error(`Failed to close database connection: ${closeError}`);
    }
  }

  return { notes: [], totalCount: 0 };
}
