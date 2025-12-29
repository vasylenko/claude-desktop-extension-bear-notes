# Bear Notes MCP Server

A Model Context Protocol (MCP) server for Bear Notes app integration with Claude and other AI assistants.

## Features

- **Search notes** by text content, tags, or date ranges (includes OCR search)
- **Read full note content** with formatting and metadata
- **Create new notes** with optional title, content, and tags
- **Add text** to existing notes (append/prepend)
- **Attach files** (images, PDFs, Excel, etc.) to notes
- **Manage tags** (list hierarchy, find untagged notes, add tags)

## Installation

### Claude Code (One Command)

**For Node.js 22.13.0+ / 23.4.0+ / 24+ / 25+ (recommended):**
```bash
claude mcp add bear-notes --transport stdio -- npx -y bear-notes-mcp
```

**For Node.js 22.5.0-22.12.x or 23.0.0-23.3.x:**
```bash
claude mcp add bear-notes --transport stdio --env NODE_OPTIONS="--experimental-sqlite" -- npx -y bear-notes-mcp
```

### Other AI Assistants

**For Node.js 22.13.0+ / 23.4.0+ / 24+ / 25+ (recommended):**
```json
{
  "mcpServers": {
    "bear-notes": {
      "command": "npx",
      "args": ["-y", "bear-notes-mcp"]
    }
  }
}
```

**For Node.js 22.5.0-22.12.x or 23.0.0-23.3.x:**
```json
{
  "mcpServers": {
    "bear-notes": {
      "command": "npx",
      "args": ["-y", "bear-notes-mcp"],
      "env": {
        "NODE_OPTIONS": "--experimental-sqlite"
      }
    }
  }
}
```

**Config file locations:**
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Cline**: VS Code Settings → Extensions → Cline → MCP Settings
- **Continue**: `~/.continue/config.json`
- **Cursor**: Settings → Cursor Settings → MCP

**Check your Node.js version:** `node --version`

## Requirements

- **Node.js** 22.5.0 or higher
- **macOS** (Bear app is macOS only)
- **Bear app** installed

## Available Tools

- `bear-search-notes` - Find notes by text content or tags
- `bear-open-note` - Read full content of a specific note
- `bear-create-note` - Create new notes with optional title, content, and tags
- `bear-add-text` - Add text to existing notes (append/prepend)
- `bear-add-file` - Attach files to existing notes
- `bear-list-tags` - List all tags as hierarchical tree with note counts
- `bear-find-untagged-notes` - Find notes with no tags
- `bear-add-tag` - Add tags to existing notes

## Privacy & Security

- **Local-only**: All operations are local, no external network calls
- **Read-only database access**: Searches use SQLite read-only mode
- **Bear native API**: Write operations use Bear's official x-callback-url API

## Links

- **Repository**: https://github.com/vasylenko/claude-desktop-extension-bear-notes
- **Issues**: https://github.com/vasylenko/claude-desktop-extension-bear-notes/issues
- **Claude Desktop Extension**: Download `.mcpb` from [releases](https://github.com/vasylenko/claude-desktop-extension-bear-notes/releases)

## License

MIT © Serhii Vasylenko
