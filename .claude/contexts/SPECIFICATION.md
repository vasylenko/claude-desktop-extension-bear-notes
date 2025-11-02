# Project Specification: Bear Notes MCP Bundle

## Product Overview

**Name:** Bear Notes MCP Bundle
**Type:** MCP Bundle (.mcpb/.dxt)
**Platform:** macOS only
**Repository:** https://github.com/vasylenko/claude-desktop-extension-bear-notes

### Purpose
Provides seamless integration between Claude Desktop and Bear Notes app, enabling AI-assisted note management through direct database access and Bear's native API.

### Value Proposition
- **Privacy-first**: All operations are local-only, zero network transmission
- **Full-text search**: Includes OCR'd content from attached images and PDFs
- **Type-safe**: Built with TypeScript for reliability
- **Supply chain secure**: Uses Node.js native SQLite (experimental) instead of third-party binaries

---

## Core Capabilities

### 1. Search Notes (`bear-search-notes`)
**Purpose:** Find notes by content or tags
**Implementation:** Direct SQLite database query with LEFT JOIN for file content
**Features:**
- Full-text search across note titles, content, and OCR'd attachments
- Tag filtering (without # prefix)
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
- File content labeled as `##filename` sections
- Always shows "Attached Files" section (even if empty)

### 3. Create Note (`bear-create-note`)
**Purpose:** Create new notes programmatically
**Implementation:** Bear x-callback-url API via macOS `open` command
**Features:**
- Optional title, content, tags
- Returns creation confirmation
- Opens in Bear app immediately

**Technical Details:**
- Non-idempotent, open-world operation
- Uses subprocess execution (spawn 'open')
- URL parameter encoding via URLSearchParams

### 4. Add Text - Append (`bear-add-text-append`)
**Purpose:** Add content to end of existing notes
**Implementation:** Bear x-callback-url API with mode=append
**Features:**
- Append to entire note or specific section (via header)
- Automatic new line insertion
- Requires note ID from search

**Technical Details:**
- Destructive, non-idempotent operation
- Uses `new_line=yes` parameter
- Section targeting via header parameter

### 5. Add Text - Prepend (`bear-add-text-prepend`)
**Purpose:** Insert content at beginning of notes
**Implementation:** Bear x-callback-url API with mode=prepend
**Features:**
- Same as append but inserts at start
- Section targeting supported

**Technical Details:**
- Same implementation as append with mode parameter change

---

## Technical Architecture

### Technology Stack
- **Language:** TypeScript 
- **Runtime:** Node.js (with --experimental-sqlite flag)
- **MCP SDK:** @modelcontextprotocol/sdk 
- **Database:** Native Node.js SQLite (node:sqlite)
- **Validation:** Zod 
- **Build:** TypeScript compiler (tsc)
- **Bundling:** @anthropic-ai/dxt 

### Key Design Decisions

1. **Native SQLite over third-party packages**
   - Rationale: Avoid macOS security blocks on unsigned binaries
   - Trade-off: Requires Node.js experimental flag
   - Benefit: Supply chain security, no binary distribution

2. **Hybrid approach (SQLite + x-callback-url)**
   - Reads: Direct database (faster, no callback handling)
   - Writes: x-callback-url (no DB corruption risk)
   - Rationale: x-success callback would require server/binary

3. **File content always included**
   - OCR'd text from images/PDFs appended to notes
   - Labeled clearly with filename headers
   - Rationale: Maximize search comprehensiveness

4. **Error handling strategy**
   - Database errors thrown immediately
   - URL execution errors captured from stderr
   - All errors logged with debug logger
   - User-friendly error messages via ERROR_MESSAGES config

---


## Known Limitations & Constraints

### Functional Limitations
- No note deletion (intentional - destructive operation)
- No tag management (could be added via x-callback-url)
- No note editing (only append/prepend)
- No support for encrypted notes (excluded from queries)
- x-callback-url has no response parsing (fire-and-forget)

### Technical Constraints
- Experimental SQLite flag required (Node.js limitation)
- No automated testing (database access requires real Bear DB)
- No cross-platform support (Bear limitation)

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
- [MCPB Specification](https://github.com/anthropics/mcpb/blob/main/README.md)
- [MCPB Manifest](https://github.com/anthropics/mcpb/blob/main/MANIFEST.md)
- [MCPB CLI](https://github.com/anthropics/mcpb/blob/main/CLI.md)
- [Taskfile Documentation](https://taskfile.dev/docs/guide)

### Bear Notes API
- [Bear x-callback-url API](https://bear.app/faq/X-callback-url%20Scheme%20documentation/)
- Bear Database Schema: Internal reverse-engineering

