# Feature Plan: Extend Search to Files and Images

## Issue Reference
GitHub Issue #4: "Extend search to files and images" by @joefrancia

## Problem Analysis
Current search implementation only queries:
- `ZSFNOTE.ZTITLE` (note titles)
- `ZSFNOTE.ZTEXT` (note content)

This misses OCRed text from attached images and PDFs, which Bear stores in:
- `ZSFNOTEFILE.ZSEARCHTEXT` (OCRed content from searchable files)

## Database Schema Analysis
```sql
-- Current query targets only ZSFNOTE table
ZSFNOTE: Contains note metadata and text content
ZSFNOTEFILE: Contains file attachments with ZSEARCHTEXT field for OCRed content

-- Key relationships:
ZSFNOTEFILE.ZNOTE -> ZSFNOTE.Z_PK (foreign key relationship)
```

## Solution Design

### 1. Add Optional includeFiles Parameter
```typescript
// Enhanced function signature
searchNotes(searchTerm?: string, tag?: string, limit?: number, includeFiles?: boolean): BearNote[]

// Tool schema update
inputSchema: {
  term: z.string().optional().describe('Text to search for in note titles and content'),
  tag: z.string().optional().describe('Tag to filter notes by (without # symbol)'),
  limit: z.number().optional().describe('Maximum number of results to return (default: 50)'),
  includeFiles: z.boolean().optional().describe('Include OCRed text from images and PDFs in search (default: false)')
}
```

### 2. Enhanced SQL Query Strategy
```sql
-- When includeFiles = false (default behavior)
SELECT ZTITLE as title, ZUNIQUEIDENTIFIER as identifier, ...
FROM ZSFNOTE 
WHERE ZARCHIVED = 0 AND ZTRASHED = 0 AND ZENCRYPTED = 0
  AND (ZTITLE LIKE ? OR ZTEXT LIKE ?)

-- When includeFiles = true (new functionality)
SELECT DISTINCT n.ZTITLE as title, n.ZUNIQUEIDENTIFIER as identifier, ...
FROM ZSFNOTE n
LEFT JOIN ZSFNOTEFILE f ON f.ZNOTE = n.Z_PK
WHERE n.ZARCHIVED = 0 AND n.ZTRASHED = 0 AND n.ZENCRYPTED = 0
  AND (n.ZTITLE LIKE ? OR n.ZTEXT LIKE ? OR f.ZSEARCHTEXT LIKE ?)
```

### 3. Implementation Strategy

#### Phase 1: Database Layer (database.ts)
- [x] Analyze current `searchNotes()` function
- [ ] Add `includeFiles?: boolean` parameter (default: false)
- [ ] Implement conditional SQL query logic
- [ ] Use `DISTINCT` to prevent duplicate results from multiple files per note
- [ ] Maintain backward compatibility

#### Phase 2: API Layer (main.ts)
- [ ] Add `includeFiles` parameter to `bear-search-notes` tool schema
- [ ] Update tool description to mention file search capability
- [ ] Pass parameter through to `searchNotes()` function
- [ ] Update JSDoc comments

#### Phase 3: Testing & Validation
- [ ] Test with `includeFiles: false` (should behave identically to current)
- [ ] Test with `includeFiles: true` (should find content in attached files)
- [ ] Verify performance impact is acceptable
- [ ] Test edge cases (notes without files, encrypted files, etc.)

## Technical Benefits

### 1. Backward Compatible
- Default behavior (`includeFiles: false`) maintains current performance
- Existing integrations continue working unchanged
- No breaking changes to API

### 2. Performance Controlled
- Users opt-in to potentially slower file searches
- JOIN operations only executed when explicitly requested
- `DISTINCT` prevents result duplication

### 3. Comprehensive Coverage
- Finds content in images/PDFs that text-only search misses
- Leverages Bear's existing OCR functionality
- No additional processing required - uses Bear's pre-indexed content

### 4. User-Centric Design
- Optional as requested in the original issue
- Clear parameter naming (`includeFiles`)
- Self-documenting API with descriptive schema

## Files to Modify

1. **src/database.ts**
   - Function: `searchNotes()` - add `includeFiles` parameter
   - Logic: Conditional SQL query construction

2. **src/main.ts**
   - Tool: `bear-search-notes` - update inputSchema
   - Description: Mention file search capability

## Performance Considerations

- File searches use `LEFT JOIN` which may be slower on large databases
- `DISTINCT` keyword prevents duplicate results but adds overhead
- Trade-off: Comprehensive search vs. performance
- User choice enables optimization for their specific use case

## Future Enhancements (Out of Scope)

- File type filtering (images only, PDFs only)
- Search result highlighting for file matches
- Separate tool for file-only searches
- Performance optimization with database indexing

## Success Criteria

1. ✅ Backward compatibility maintained
2. ✅ New functionality works as described in issue
3. ✅ Performance impact is acceptable for optional feature
4. ✅ Code follows project style guidelines
5. ✅ Implementation follows KISS and DRY principles