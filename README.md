# Bear Notes MCP Bundle

Search, read, and update your Bear Notes directly from Claude conversations.

This Claude Desktop extension (bundled MCP server) provides seamless integration between AI assistance and your personal note-taking workflow with complete privacy: local-only operations, no external connections.

## Quick Start

**Prerequisites**: [Bear app](https://bear.app/) must be installed and [Claude Desktop](https://claude.ai/download) must be installed.

1. Download the latest `bear-notes-mcp.dxt` extension from releases
2. Make sure your Claude Desktop is running (start if not)
3. Doubleclick on the extension file – Claude Desktop should show you the installation prompt
    3.1 If doubleclick does not work for some reason, then open Claude -> Settings -> Extensions -> Advanced Settings -> click "Install Extension".
4. You're all set!

Ask Claude to search your Bear notes with a query like "Search my Bear notes for 'meeting'" - you should see your notes appear in the response!

## MCP Server Tools

Use direct SQLite **readonly** access:
- **`bear-search-notes`** - Find notes by text content or tags, returns list with IDs for further actions
- **`bear-open-note`** - Read full content of a specific note including text, formatting, and metadata  

(this is because x-callback-url for that tools would require either a server or custom binary to accept `x-success` – both options are potentially risky and fragile)

Use native Bear app x-callback-url API:
- **`bear-create-note`** - Create new notes with optional title, content, and tags
- **`bear-add-text-append`** - Add text to the end of existing notes or specific sections
- **`bear-add-text-prepend`** - Insert text at the beginning of existing notes or sections

## Technical Details

This server reads your Bear Notes SQLite database directly for search/read operations and uses Bear's X-callback-URL API for write operations. All data processing happens locally on your machine with no external network calls.

### Logs
- MCP server logs go into `~/Library/Logs/Claude/main.log`, look for `bear-notes-mcp`
- MCP transport logs go to `~/Library/Logs/Claude/mcp-server-Bear\ Notes.log` 