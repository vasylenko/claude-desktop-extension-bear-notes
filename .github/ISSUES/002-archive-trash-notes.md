# feat: Add tools for archiving and trashing notes

## User Story

As a user managing my knowledge base, I want to archive or delete notes that are no longer actively needed so I can keep my notes organized without permanently losing information.

## Problem

Currently, the extension can only create and modify notes. There is no way to:
- Archive notes that are complete or no longer active
- Move notes to trash for cleanup
- Manage the note lifecycle through automation

This limits the ability to maintain an organized note system, especially when AI assistants help with note management workflows.

## Proposed Solution

Add two tools for note lifecycle management:
- `bear-archive-note`: Move a note to Bear's archive
- `bear-trash-note`: Move a note to Bear's trash

### Tool Specifications

```typescript
'bear-archive-note': {
  title: 'Archive Note',
  description: 'Move a note to Bear archive. Archived notes are hidden from main view but preserved for reference.',
  inputSchema: {
    id: z.string().describe('Note identifier (ID) from bear-search-notes')
  }
}

'bear-trash-note': {
  title: 'Trash Note',
  description: 'Move a note to Bear trash. Notes in trash are deleted after 7 days.',
  inputSchema: {
    id: z.string().describe('Note identifier (ID) from bear-search-notes')
  }
}
```

## Implementation Plan

1. Register `bear-archive-note` tool in `main.ts`:
   - Validate note exists using `getNoteContent(id)`
   - Build URL: `buildBearUrl('archive', { id, show_window: 'no' })`
   - Execute via `executeBearXCallbackApi()`

2. Register `bear-trash-note` tool in `main.ts`:
   - Validate note exists using `getNoteContent(id)`
   - Build URL: `buildBearUrl('trash', { id, show_window: 'no' })`
   - Execute via `executeBearXCallbackApi()`

3. Add tests for both tools

### Bear URL Scheme Reference

```
bear://x-callback-url/archive?id={id}&show_window={yes|no}
bear://x-callback-url/trash?id={id}&show_window={yes|no}
```

## Design Decision

Two separate tools instead of one tool with an action parameter because:
- Clear intent - each tool has single responsibility
- Better discoverability for AI tool selection
- Matches existing tool patterns in the codebase
- Trash is destructive, archive is not - different annotations

## Acceptance Criteria

- [ ] `bear-archive-note` moves note to archive
- [ ] `bear-trash-note` moves note to trash
- [ ] Both tools validate note exists before action
- [ ] Both tools return confirmation with note title
- [ ] Error handling for non-existent notes
- [ ] Tests pass
