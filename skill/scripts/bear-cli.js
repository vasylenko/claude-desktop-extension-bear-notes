#!/usr/bin/env node
/**
 * CLI wrapper for Bear Notes functionality
 * Exposes MCP server functions as command-line tool for use in Claude Skills
 */

import { parseArgs } from 'node:util';
import { getNoteContent, searchNotes } from '../../dist/notes.js';
import { listTags, findUntaggedNotes } from '../../dist/tags.js';
import { buildBearUrl, executeBearXCallbackApi } from '../../dist/bear-urls.js';

const commands = {
  search: searchNotesCommand,
  read: readNoteCommand,
  create: createNoteCommand,
  'add-text': addTextCommand,
  'add-file': addFileCommand,
  'list-tags': listTagsCommand,
  'find-untagged': findUntaggedCommand,
  'add-tag': addTagCommand,
};

async function searchNotesCommand(args) {
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      term: { type: 'string' },
      tag: { type: 'string' },
      limit: { type: 'string' },
      'created-after': { type: 'string' },
      'created-before': { type: 'string' },
      'modified-after': { type: 'string' },
      'modified-before': { type: 'string' },
      pinned: { type: 'boolean' },
    },
    allowPositionals: true,
  });

  const dateFilter = {};
  if (values['created-after']) dateFilter.createdAfter = values['created-after'];
  if (values['created-before']) dateFilter.createdBefore = values['created-before'];
  if (values['modified-after']) dateFilter.modifiedAfter = values['modified-after'];
  if (values['modified-before']) dateFilter.modifiedBefore = values['modified-before'];

  const { notes, totalCount } = searchNotes(
    values.term,
    values.tag,
    values.limit ? parseInt(values.limit) : undefined,
    Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    values.pinned
  );

  if (notes.length === 0) {
    console.log('No notes found.');
    return;
  }

  const hasMore = totalCount > notes.length;
  const countDisplay = hasMore
    ? `${notes.length} notes (${totalCount} total matching)`
    : `${notes.length} note${notes.length === 1 ? '' : 's'}`;

  console.log(`Found ${countDisplay}:\n`);

  notes.forEach((note, index) => {
    const noteTitle = note.title || 'Untitled';
    const modifiedDate = new Date(note.modification_date).toLocaleDateString();
    const createdDate = new Date(note.creation_date).toLocaleDateString();

    console.log(`${index + 1}. ${noteTitle}`);
    console.log(`   Created: ${createdDate}`);
    console.log(`   Modified: ${modifiedDate}`);
    console.log(`   ID: ${note.identifier}\n`);
  });

  if (hasMore) {
    console.log(`Use --limit ${totalCount} to get all results.`);
  }
}

async function readNoteCommand(args) {
  const identifier = args[1];

  if (!identifier) {
    console.error('Error: Note ID required');
    console.error('Usage: bear-cli read <note-id>');
    process.exit(1);
  }

  const note = getNoteContent(identifier);

  if (!note) {
    console.error(`Note with ID '${identifier}' not found.`);
    process.exit(1);
  }

  console.log(`**${note.title}**`);
  console.log(`Modified: ${note.modification_date}`);
  console.log(`ID: ${note.identifier}`);
  console.log('\n---\n');
  console.log(note.text || '*This note appears to be empty.*');
}

async function createNoteCommand(args) {
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      title: { type: 'string' },
      text: { type: 'string' },
      tags: { type: 'string' },
    },
  });

  const url = buildBearUrl('create', {
    title: values.title,
    text: values.text,
    tags: values.tags,
  });

  await executeBearXCallbackApi(url);

  console.log('Bear note created successfully!\n');
  if (values.title) console.log(`Title: "${values.title}"`);
  if (values.text) console.log(`Content: ${values.text.length} characters`);
  if (values.tags) console.log(`Tags: ${values.tags}`);
}

async function addTextCommand(args) {
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      id: { type: 'string' },
      text: { type: 'string' },
      header: { type: 'string' },
      position: { type: 'string', default: 'end' },
    },
  });

  if (!values.id || !values.text) {
    console.error('Error: --id and --text are required');
    console.error('Usage: bear-cli add-text --id <note-id> --text "content" [--position beginning|end] [--header "Section"]');
    process.exit(1);
  }

  const mode = values.position === 'beginning' ? 'prepend' : 'append';

  const url = buildBearUrl('add-text', {
    id: values.id,
    text: values.text,
    header: values.header,
    mode,
  });

  await executeBearXCallbackApi(url);
  console.log('Text added successfully!');
}

async function addFileCommand(args) {
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      id: { type: 'string' },
      title: { type: 'string' },
      file: { type: 'string' },
      filename: { type: 'string' },
    },
  });

  if (!values.file || !values.filename) {
    console.error('Error: --file and --filename are required');
    console.error('Usage: bear-cli add-file --id <note-id> --file <base64-content> --filename "file.pdf"');
    process.exit(1);
  }

  if (!values.id && !values.title) {
    console.error('Error: Either --id or --title is required');
    process.exit(1);
  }

  const url = buildBearUrl('add-file', {
    id: values.id,
    title: values.title,
    file: values.file,
    filename: values.filename,
  });

  await executeBearXCallbackApi(url);
  console.log(`File "${values.filename}" added successfully!`);
}

async function listTagsCommand() {
  const { tags, totalCount } = listTags();

  if (totalCount === 0) {
    console.log('No tags found in your Bear library.');
    return;
  }

  console.log(`Found ${totalCount} tag${totalCount === 1 ? '' : 's'}:\n`);

  function printTagTree(tags, isLast = []) {
    tags.forEach((tag, i) => {
      const isLastItem = i === tags.length - 1;
      let linePrefix = '';

      for (let j = 0; j < isLast.length; j++) {
        linePrefix += isLast[j] ? '    ' : '│   ';
      }
      linePrefix += isLastItem ? '└── ' : '├── ';

      console.log(`${linePrefix}${tag.name} (${tag.noteCount})`);

      if (tag.children.length > 0) {
        printTagTree(tag.children, [...isLast, isLastItem]);
      }
    });
  }

  tags.forEach(tag => {
    console.log(`${tag.name} (${tag.noteCount})`);
    if (tag.children.length > 0) {
      printTagTree(tag.children);
    }
  });
}

async function findUntaggedCommand(args) {
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      limit: { type: 'string' },
    },
  });

  const { notes, totalCount } = findUntaggedNotes(
    values.limit ? parseInt(values.limit) : undefined
  );

  if (notes.length === 0) {
    console.log('No untagged notes found. All your notes have tags!');
    return;
  }

  const hasMore = totalCount > notes.length;
  const countDisplay = hasMore
    ? `${notes.length} untagged notes (${totalCount} total)`
    : `${notes.length} untagged note${notes.length === 1 ? '' : 's'}`;

  console.log(`Found ${countDisplay}:\n`);

  notes.forEach((note, index) => {
    const modifiedDate = new Date(note.modification_date).toLocaleDateString();
    console.log(`${index + 1}. ${note.title}`);
    console.log(`   Modified: ${modifiedDate}`);
    console.log(`   ID: ${note.identifier}\n`);
  });

  if (hasMore) {
    console.log(`Use --limit ${totalCount} to get all results.`);
  }
}

async function addTagCommand(args) {
  const { values, positionals } = parseArgs({
    args: args.slice(1),
    options: {
      id: { type: 'string' },
    },
    allowPositionals: true,
  });

  if (!values.id || positionals.length === 0) {
    console.error('Error: --id and tag names are required');
    console.error('Usage: bear-cli add-tag --id <note-id> tag1 tag2 tag3');
    process.exit(1);
  }

  const note = getNoteContent(values.id);
  if (!note) {
    console.error(`Note with ID '${values.id}' not found.`);
    process.exit(1);
  }

  const tags = positionals.join(',');
  const url = buildBearUrl('add-text', {
    id: values.id,
    tags,
    mode: 'prepend',
    open_note: 'no',
    show_window: 'no',
    new_window: 'no',
  });

  await executeBearXCallbackApi(url);

  const tagList = positionals.map(t => `#${t}`).join(', ');
  console.log('Tags added successfully!');
  console.log(`Note: "${note.title}"`);
  console.log(`Tags: ${tagList}`);
}

function printUsage() {
  console.log(`
Bear Notes CLI - Command-line interface for Bear Notes

Usage: bear-cli <command> [options]

Commands:
  search              Search for notes
    --term            Search term
    --tag             Filter by tag
    --limit           Max results (default: 50)
    --created-after   Date filter (e.g., "today", "2024-01-01")
    --created-before  Date filter
    --modified-after  Date filter
    --modified-before Date filter
    --pinned          Only pinned notes

  read <note-id>      Read note content

  create              Create new note
    --title           Note title
    --text            Note content
    --tags            Comma-separated tags

  add-text            Add text to note
    --id              Note ID (required)
    --text            Text to add (required)
    --header          Section header
    --position        "beginning" or "end" (default: end)

  add-file            Attach file to note
    --id              Note ID
    --title           Note title (if no ID)
    --file            Base64-encoded file content
    --filename        Filename with extension

  list-tags           List all tags

  find-untagged       Find notes without tags
    --limit           Max results (default: 50)

  add-tag             Add tags to note
    --id              Note ID (required)
    tag1 tag2...      Tag names (without #)

Examples:
  bear-cli search --term "meeting notes" --limit 10
  bear-cli read ABC123-DEF456
  bear-cli create --title "Daily Journal" --tags "journal,personal"
  bear-cli add-text --id ABC123 --text "New entry" --position end
  bear-cli list-tags
  bear-cli add-tag --id ABC123 work important
`);
}

// Main execution
const command = process.argv[2];

if (!command || command === '--help' || command === '-h') {
  printUsage();
  process.exit(0);
}

const handler = commands[command];

if (!handler) {
  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

try {
  await handler(process.argv.slice(2));
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
