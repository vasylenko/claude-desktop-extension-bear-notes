GH issue: https://github.com/vasylenko/claude-desktop-extension-bear-notes/issues/28

# Story
I want to analyze untagged notes and apply proper tags (from what I have, not create new ones) to sort things out properly.

# Draft Plan
- Explore the database scheme to find what do we store about tags
- Analyze possibilities
- Implement the tag search and display
- Add more features if the scheme exploration reveals something interesting

# DB schema info related to Tags

## Core Tables

### ZSFNOTETAG - Tags Table
Stores all tags with their metadata:
- `Z_PK` - internal primary key
- `ZTITLE` - tag name (URL-encoded, e.g., `+What+is+Gravity` for spaces)
- `ZISROOT` - 1=top-level tag, 0=subtag (child of another tag)
- `ZPINNED` - 1=pinned in sidebar
- `ZENCRYPTED` - tag encryption status
- `ZSORTING` / `ZSORTINGDIRECTION` - user's sorting preferences for this tag
- `ZUNIQUEIDENTIFIER` - UUID for the tag

### Z_5TAGS - Note-Tag Junction Table
Many-to-many relationship between notes and tags:
- `Z_5NOTES` - FK to ZSFNOTE.Z_PK
- `Z_13TAGS` - FK to ZSFNOTETAG.Z_PK

## Tag Hierarchy

Bear stores hierarchical tags using path notation in ZTITLE:
- Root tags: `career`, `personal`, `WISDOM`
- Subtags: `career/content`, `career/content/blog`, `personal/projects/norway2025`

The `ZISROOT` field distinguishes root (1) vs nested (0) tags.

Example hierarchy:
```
career (ZISROOT=1)
  └─ career/content (ZISROOT=0)
     └─ career/content/blog (ZISROOT=0)
```

## Key Queries

### Find untagged notes
```sql
SELECT ZTITLE, ZUNIQUEIDENTIFIER
FROM ZSFNOTE
WHERE ZARCHIVED = 0 AND ZTRASHED = 0
  AND Z_PK NOT IN (SELECT Z_5NOTES FROM Z_5TAGS);
```

### Get all tags with note count
```sql
SELECT t.ZTITLE, COUNT(nt.Z_5NOTES) as note_count
FROM ZSFNOTETAG t
LEFT JOIN Z_5TAGS nt ON nt.Z_13TAGS = t.Z_PK
GROUP BY t.Z_PK
ORDER BY note_count DESC;
```

### Get notes for a specific tag
```sql
SELECT n.ZTITLE, n.ZUNIQUEIDENTIFIER
FROM ZSFNOTE n
JOIN Z_5TAGS nt ON nt.Z_5NOTES = n.Z_PK
JOIN ZSFNOTETAG t ON t.Z_PK = nt.Z_13TAGS
WHERE t.ZTITLE = 'career' AND n.ZARCHIVED = 0 AND n.ZTRASHED = 0;
```

## Current Statistics (from live DB)
- Total tags: 46
- Root tags: 29
- Nested tags: 17
- Untagged notes: 13

# DB Tags possibilities

## What we CAN do (read operations via DB)
1. **List all tags** - with note count, hierarchy info, pinned status
2. **Find untagged notes** - notes not in Z_5TAGS junction
3. **Get tag hierarchy** - reconstruct tree from path notation + ZISROOT
4. **Search tags** - by name pattern
5. **Get notes by tag** - via junction table
6. **Tag statistics** - counts, most/least used, empty tags

## Bear URL Schemes for Tags
Bear has x-callback-url actions for tags:
- `/tags` - list all tags (returns via x-success callback)
- `/open-tag` - get notes for a tag (returns via x-success callback)
- `/rename-tag` - rename a tag (fire-and-forget works)
- `/delete-tag` - delete a tag (fire-and-forget works)

**Important limitation**: We cannot receive x-success callbacks in MCP context.
Read operations (`/tags`, `/open-tag`) are useless - we can't get the response.
Write operations (`/rename-tag`, `/delete-tag`) work as fire-and-forget.

## What we can actually use
| Operation | Method | Notes |
|-----------|--------|-------|
| List tags | DB | Direct query, full control |
| Tag hierarchy | DB | ZISROOT + path parsing |
| Note counts | DB | JOIN query |
| Untagged notes | DB | NOT IN query |
| Rename tag | URL scheme | Fire-and-forget, no confirmation |
| Delete tag | URL scheme | Fire-and-forget, no confirmation |

**Conclusion**: DB for all reads. URL scheme only for writes (with UX caveat: no success confirmation).

## Notes on data format
- Tags with spaces are URL-encoded with `+` (e.g., `+What+is+Gravity`)
- We should decode these for display
- Hierarchical paths use `/` separator

# Main feature implementation plan

## Decisions
- 2 MCP tools (not 4): hierarchy covers listing, existing search covers notes-by-tag
- No pinned status in output (not needed for the use case)
- Use DB for reads (richer data, no token needed)

## MCP Tools

### 1. `bear-list-tags`
Returns all tags as a hierarchical tree with note counts.

**Input parameters:** none

**Output:**
```json
{
  "tags": [
    {
      "name": "career",
      "displayName": "career",
      "noteCount": 42,
      "children": [
        {
          "name": "career/content",
          "displayName": "content",
          "noteCount": 11,
          "children": [
            {
              "name": "career/content/blog",
              "displayName": "blog",
              "noteCount": 9,
              "children": []
            }
          ]
        }
      ]
    }
  ],
  "totalCount": 46
}
```

### 2. `bear-find-untagged-notes`
Find notes that have no tags.

**Input parameters:**
- `limit` (number, default: 50) - max notes to return

**Output:**
```json
{
  "notes": [
    {
      "title": "Note title",
      "uuid": "...",
      "createdAt": "...",
      "modifiedAt": "..."
    }
  ],
  "totalCount": 13
}
```

## Implementation Notes

1. **Tag name decoding**: Replace `+` with spaces for display names
2. **displayName**: Show leaf name only (e.g., "blog" not "career/content/blog")
3. **Hierarchy building**: Parse path notation, use ZISROOT to identify roots
4. **Existing code reuse**: Leverage `database.ts` patterns for DB access

# Additional possibilities (based on discovery)

## Future considerations
- **Tag rename/delete**: Could add via Bear URL scheme (but requires careful UX)
- **Empty tags detection**: Tags with 0 notes (orphaned after note deletion)
- **Tag suggestions**: Based on note content analysis (AI-assisted tagging)