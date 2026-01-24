# feat: Add tool to discover note links and backlinks

## User Story

As a user building a connected knowledge base, I want to see which notes link to a specific note and which notes it links to so I can navigate relationships between ideas and discover connections in my notes.

## Problem

Bear supports wiki-style `[[note links]]` that create relationships between notes. Currently, there is no way to:
- Find notes that reference a specific note (backlinks)
- See what notes a specific note links to (outgoing links)
- Navigate the knowledge graph through automation

This limits the ability to leverage note connections for research, refactoring, or understanding how ideas relate.

## Proposed Solution

Add a `bear-get-note-links` tool that returns bidirectional relationships for a note:
- **Backlinks**: Notes that link TO the specified note
- **Outgoing links**: Notes the specified note links TO

### Tool Specification

```typescript
'bear-get-note-links': {
  title: 'Get Note Links',
  description: 'Find notes linked to and from a specific note. Returns backlinks (notes referencing this note) and outgoing links (notes this note references).',
  inputSchema: {
    id: z.string().describe('Note identifier (ID) from bear-search-notes')
  }
}
```

### Response Format

```
Note: "Project Ideas"

Backlinks (3 notes link to this note):
1. **Weekly Review** - Modified: 1/20/2026 - ID: abc123
2. **Meeting Notes** - Modified: 1/18/2026 - ID: def456
3. **Roadmap** - Modified: 1/15/2026 - ID: ghi789

Outgoing Links (2 notes linked from this note):
1. **Research Topics** - Modified: 1/22/2026 - ID: jkl012
2. **Team Members** - Modified: 1/10/2026 - ID: mno345
```

## Implementation Plan

1. Add helper function `getNoteLinks(identifier: string)` in `notes.ts`:

```typescript
interface NoteLinks {
  backlinks: BearNote[];  // Notes linking TO this note
  outgoing: BearNote[];   // Notes this note links TO
}

function getNoteLinks(identifier: string): NoteLinks {
  // Get the note's Z_PK from identifier
  // Query ZSFNOTEBACKLINK table for relationships
}
```

2. Database queries using `ZSFNOTEBACKLINK` table:

```sql
-- Get note's internal PK
SELECT Z_PK FROM ZSFNOTE WHERE ZUNIQUEIDENTIFIER = ?

-- Backlinks: notes that link TO this note
SELECT n.ZTITLE, n.ZUNIQUEIDENTIFIER, n.ZMODIFICATIONDATE, n.ZCREATIONDATE
FROM ZSFNOTE n
JOIN ZSFNOTEBACKLINK bl ON bl.ZLINKEDBY = n.Z_PK
WHERE bl.ZLINKINGTO = ?
  AND n.ZARCHIVED = 0 AND n.ZTRASHED = 0

-- Outgoing: notes this note links TO
SELECT n.ZTITLE, n.ZUNIQUEIDENTIFIER, n.ZMODIFICATIONDATE, n.ZCREATIONDATE
FROM ZSFNOTE n
JOIN ZSFNOTEBACKLINK bl ON bl.ZLINKINGTO = n.Z_PK
WHERE bl.ZLINKEDBY = ?
  AND n.ZARCHIVED = 0 AND n.ZTRASHED = 0
```

3. Register tool in `main.ts` following existing patterns

4. Add tests

## Design Decisions

- **Single tool for both directions**: Backlinks and outgoing links are typically needed together for context. Separate tools would require two calls for common use cases.
- **Read-only database access**: Uses existing `openBearDatabase()` pattern, no x-callback-url needed.
- **Exclude archived/trashed**: Only return active notes to avoid confusion.

## Acceptance Criteria

- [ ] Tool returns backlinks for a note
- [ ] Tool returns outgoing links for a note
- [ ] Handles notes with no links gracefully
- [ ] Validates note exists before querying links
- [ ] Error handling for non-existent notes
- [ ] Tests pass
