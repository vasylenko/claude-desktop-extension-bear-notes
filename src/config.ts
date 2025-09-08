import packageJson from '../package.json' assert { type: 'json' };
export const APP_VERSION = packageJson.version;
export const BEAR_URL_SCHEME = 'bear://x-callback-url/';
export const CORE_DATA_EPOCH_OFFSET = 978307200; // 2001-01-01 to Unix epoch
export const DEFAULT_SEARCH_LIMIT = 50;

export const BEAR_DATABASE_PATH =
  'Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite';

export const ERROR_MESSAGES = {
  BEAR_DATABASE_NOT_FOUND:
    'Bear database not found. Please ensure Bear Notes is installed and has been opened at least once.',
  MISSING_SEARCH_PARAM: 'Please provide either a search term or a tag to search for notes.',
  MISSING_NOTE_ID:
    'Please provide a note identifier. Use bear-search-notes first to find the note ID.',
  MISSING_TEXT_PARAM: 'Text input parameter is required and must be a non-empty string',
} as const;

// Bear API docs - https://bear.app/faq/x-callback-url-scheme-documentation/
// Bear DB location explained - https://bear.app/faq/where-are-bears-notes-located/
// core message we care about: "it is safe to access the database for reading only" - this is what we do in this project
