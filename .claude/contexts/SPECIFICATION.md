# Project Specification: Bear Notes MCP Bundle

## Product Overview

**Name:** Bear Notes MCP Bundle
**Type:** MCP Bundle (.mcpb)
**Platform:** macOS only
**Repository:** https://github.com/vasylenko/claude-desktop-extension-bear-notes

### Purpose
Provides seamless integration between Claude Desktop and Bear Notes app, enabling AI-assisted note management through direct database access and Bear's native API.

### Value Proposition
- **Privacy-first**: All operations are local-only, zero network transmission
- **Full-text search**: Includes OCR'd content from attached images and PDFs
- **Type-safe**: Built with TypeScript for reliability
- **Supply chain secure**: Uses Node.js native SQLite instead of third-party binaries

---

## Core Capabilities

### 1. Search Notes (`bear-search-notes`)
**Purpose:** Find notes by content, tags, or date ranges
**Implementation:** Direct SQLite database query with LEFT JOIN for file content
**Features:**
- Full-text search across note titles, content, and OCR'd attachments
- Tag filtering (without # prefix)
- Date filtering (created/modified before/after with relative date support)
- Configurable result limit (default: 50)
- Returns metadata only for performance

**Technical Details:**
- Read-only, idempotent operation
- Searches ZSFNOTE and ZSFNOTEFILE tables
- Excludes archived, trashed, and encrypted notes
- Results sorted by modification date (DESC)

### 2. Read Note (`bear-open-note`)
**Purpose:** Retrieve full content of a specific note
**Implementation:** SQLite query with file content aggregation
**Features:**
- Returns complete note text with markdown formatting
- Appends attached file content with clear labeling
- Includes metadata (title, dates, ID)

**Technical Details:**
- Read-only, idempotent operation
- Aggregates multiple rows (note + files) into single response
- File content labeled as `## filename` sections

### 3. Create Note (`bear-create-note`)
**Purpose:** Create new notes programmatically
**Implementation:** Bear x-callback-url API via macOS `open` command
**Features:**
- Optional title, content, tags
- Returns creation confirmation
- Note available in Bear immediately

**Technical Details:**
- Non-idempotent, open-world operation
- Uses subprocess execution (spawn 'open' with -g flag to prevent focus steal)
- URL parameter encoding via URLSearchParams

### 4. Add Text (`bear-add-text`)
**Purpose:** Add content to existing notes at beginning or end
**Implementation:** Bear x-callback-url API with mode parameter
**Features:**
- Position parameter: 'beginning' (prepend) or 'end' (append, default)
- Section targeting via header parameter
- Automatic new line insertion
- Requires note ID from search

**Technical Details:**
- Destructive, non-idempotent operation
- Uses `new_line=yes` parameter
- Section targeting via header parameter

### 5. Add File (`bear-add-file`)
**Purpose:** Attach files to existing notes
**Implementation:** Bear x-callback-url API with base64-encoded content
**Features:**
- Accepts base64-encoded file content
- Supports all file types (images, PDFs, documents, etc.)
- Can target note by ID or title

**Technical Details:**
- Destructive, non-idempotent operation
- Base64 content cleaned of line breaks before URL encoding
- Validates note existence before attempting attachment

### 6. List Tags (`bear-list-tags`)
**Purpose:** Display all tags in the Bear library
**Implementation:** Direct SQLite query on ZSFNOTETAG table
**Features:**
- Returns hierarchical tree structure
- Includes note counts per tag
- Shows nested tags with proper indentation

**Technical Details:**
- Read-only, idempotent operation
- Builds tree from flat tag list using path separators
- Excludes system tags

### 7. Find Untagged Notes (`bear-find-untagged-notes`)
**Purpose:** Find notes without any tags
**Implementation:** SQLite query with LEFT JOIN exclusion
**Features:**
- Returns notes that have no tags assigned
- Configurable result limit (default: 50)
- Useful for organization workflows

**Technical Details:**
- Read-only, idempotent operation
- Excludes archived, trashed, and encrypted notes

### 8. Add Tag (`bear-add-tag`)
**Purpose:** Add tags to existing notes
**Implementation:** Bear x-callback-url API with tags parameter
**Features:**
- Add one or more tags at once
- Tags added at beginning of note
- Supports nested tags (e.g., "work/meetings")

**Technical Details:**
- Non-destructive, non-idempotent operation
- Validates note existence before adding tags
- Uses prepend mode with tags parameter

---

## Technical Architecture

### Technology Stack
- **Language:** TypeScript
- **Runtime:** Node.js >=22.13.0
- **MCP SDK:** @modelcontextprotocol/sdk
- **Database:** Native Node.js SQLite (node:sqlite)
- **Validation:** Zod
- **Build:** TypeScript compiler (tsc)
- **Bundling:** @anthropic-ai/mcpb

### Key Design Decisions

1. **Native SQLite over third-party packages**
   - Rationale: Avoid macOS security blocks on unsigned binaries
   - Benefit: Supply chain security, no binary distribution

2. **Hybrid approach (SQLite + x-callback-url)**
   - Reads: Direct database (faster, no callback handling)
   - Writes: x-callback-url (no DB corruption risk)
   - Rationale: x-success callback would require server/binary

3. **File content always included**
   - OCR'd text from images/PDFs included in search and read
   - Labeled clearly with filename headers
   - Rationale: Maximize search comprehensiveness

4. **Background execution for writes**
   - Uses `open -g` flag to prevent Bear from stealing focus
   - Better UX when working in Claude Desktop

5. **Error handling strategy**
   - Database errors thrown immediately
   - URL execution errors captured from stderr
   - All errors logged with debug logger
   - User-friendly error messages via ERROR_MESSAGES config

---

## Known Limitations & Constraints

### Functional Limitations
- No note deletion (intentional - destructive operation)
- No support for encrypted notes (excluded from queries)
- x-callback-url has no response parsing (fire-and-forget)

### Technical Constraints
- No automated testing (database access requires real Bear DB)
- No cross-platform support (Bear is macOS only)

## Success Metrics

### Adoption
- GitHub stars/forks
- Issue reports and feature requests
- Download count from releases

### Quality
- Zero supply chain vulnerabilities (Snyk badge)
- Passing CI/CD workflows
- Low bug report rate

### User Satisfaction
- Positive feedback in discussions
- Minimal support requests
- Community contributions

## References

### Documentation
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md)
- [MCPB Specification](https://github.com/modelcontextprotocol/mcpb/blob/main/README.md)
- [MCPB Manifest](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md)
- [MCPB CLI](https://github.com/modelcontextprotocol/mcpb/blob/main/CLI.md)
- [Taskfile Documentation](https://taskfile.dev/docs/guide)

### Bear Notes API
- [Bear x-callback-url API](https://bear.app/faq/X-callback-url%20Scheme%20documentation/)
- Bear Database Schema: Internal reverse-engineering
