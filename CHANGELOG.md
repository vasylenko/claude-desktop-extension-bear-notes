# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - YYYY-MM-DD

### Added
- **Pinned Notes Filter**: New `pinned` parameter for `bear-search-notes` tool ([#37](https://github.com/vasylenko/claude-desktop-extension-bear-notes/issues/37)).
  Matches Bear's UI:
  - `pinned: true` alone works as the pinned section in UI – show all pinned notes, no mater where they were pinned
  - `pinned: true` with `tag` returns notes pinned within that tag
  - Combines with other filters (search term, dates) for refined searches

- **Total Count in Search Results**: Search tools now report total matching count when results are truncated ([#36](https://github.com/vasylenko/claude-desktop-extension-bear-notes/issues/36)).

  AI agents can now make informed decisions about fetching more results instead of guessing.

  **Before:**
  ```
  Found 50 notes:
  1. Meeting Notes
     ...
  ```

  **After:**
  ```
  Found 50 notes (114 total matching):
  1. Meeting Notes
     ...

  Use bear-search-notes with limit: 114 to get all results.
  ```

  Applies to `bear-search-notes` and `bear-find-untagged-notes`.

  _Implementation: Uses SQLite window function `COUNT(*) OVER()` with CTE for accurate distinct count in a single query – no extra database round trip. Pagination was considered but skipped (YAGNI) – exposing total count lets agents simply request higher limit when needed, no code complications._

### Removed
- **`--experimental-sqlite` flag**: No longer required b/c Claude ships with 22.21.1 (as of Jan'26) that has SQLite enabled by default.

## [2.1.1] - 2025-12-30

### Internal
- **Preparation for Desktop Extension Catalog submission**
  - adjustments to the extension manifest
  - updates to README.md
  - demo screenshot


**No features/tools changes in this release**

## [2.1.0] - 2025-12-30

### Added
- **Use bear-mcp-server standalone**: You can now use the MCP server from this extension separately, e.g., for your Claude Code, Cursor, Codex or other AI tool
  - npmjs publishing with additional GH action
  - updated task for versions to process version changes in package-lock.json

Standalone MCP usage instructions -- [NPM.md](./docs/NPM.md)

**No features/tools changes in this release**

## [2.0.0] - 2025-12-26

### Changed
- **Migrated from DXT to MCPB**: Anthropic renamed Desktop Extensions (DXT) to MCP Bundles (MCPB)
  - Package extension changed from `.dxt` to `.mcpb`
  - Updated to `@anthropic-ai/mcpb` v2.1.2
  - Manifest updated to MCPB 0.3 specification

mcpb is a core tool for the extension and together with manifest schema update, these changes together mark the v2.0 of the extension

**Features (MCP tools) are the same as in 1.4.0 – no changes to business logic in this release**

If you experience difficulties installing the new extension format *mcpb*, please use [v1.4.0](https://github.com/vasylenko/claude-desktop-extension-bear-notes/releases/tag/v1.4.0) for now and let me know through GitHub issue.

## [1.4.0] - 2025-12-25

### Added
- **Tag Management Tools**:
  - `bear-list-tags` - List all tags as hierarchical tree with note counts
  - `bear-find-untagged-notes` - Find notes without any tags
  - `bear-add-tag` - Add one or more tags to existing notes

### Changed
- **Merged text tools**: Combined `bear-add-text-append` and `bear-add-text-prepend` into single `bear-add-text` tool with `position` parameter ('beginning' or 'end')

### Fixed
- Bear no longer steals focus when executing URL commands (uses `open -g` flag)

### Internal
- Refactored `database.ts` into separate `notes.ts` and `tags.ts` modules
- Added UX parameters (`open_note`, `new_window`, `show_window`) to Bear URL builder

## [1.3.0] - 2025-11-17
Authored by @bborysenko (_thank you, Borys!_)

### Added
- **Date-based search**: 
  - supports filtering by note's creation and modification date
  - supports relative dates, e.g., 'yesterday' or 'last week', etc or exact dates
  - notes can be searched by date alone, without requiring a search term or tag


## [1.2.0] - 2025-11-02

### Added
- **File Attachment Support**: New `bear-add-file` tool for attaching files to Bear notes
  - Accepts base64-encoded file content (works with Claude Desktop's files feature)
  - Supports all file types supported by Claude Desktop

### Technical
- Optimized for Claude Desktop's sandbox architecture - no external filesystem access required
- Base64 encoding happens in Claude's sandbox via built-in shell commands

### Known limitation
- Tool streaming passes base64 to the MCP tool call very slow – not a bug, just the way it works in Claude :-(

## [1.1.0] - 2025-09-08

### Added
- **File Search**: Extended search functionality to include OCR'd text from images and PDFs ([#4](https://github.com/vasylenko/claude-desktop-extension-bear-notes/issues/4))

  Prioritize completeness over context window efficiency - better to have full information upfront than incomplete results requiring multiple API calls and confused MCP client or an end user.

    - Always search files: searchNotes() hardcoded to include OCR content from attachments - no includeFiles parameter
    - Always retrieve files: getNoteContent() hardcoded to include OCR content - no includeFiles parameter
    - Clear content separation: OCR content labeled with `# Attached Files` and `## filename` headers
    - LLM and user experience: Complete context with clear source distinction between note text and file content  

### Internal
- For Claude Code:
    - Comprehensive Bear database schema documentation
    - Enhanced development tooling with KISS/DRY code validation commands
    - Tool documentation best practices guidelines
- Small refactoring

## [1.0.0] - 2025-09-02

First release. 

Bear Notes MCP Bundle - Claude Desktop extension for comprehensive Bear Notes integration.

Features:
- 5 MCP tools: search, read, create, and append/prepend to Bear notes
- Tool annotations for client safety and UX hints
- Native Node.js SQLite for read oprations
- Bear's X-callback-URL API integration for write operations
- Debug logging with UI toggle
