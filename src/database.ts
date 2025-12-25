import { DatabaseSync } from 'node:sqlite';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { BEAR_DATABASE_PATH, ERROR_MESSAGES } from './config.js';
import { logAndThrow, logger } from './utils.js';

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

export function openBearDatabase(): DatabaseSync {
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
