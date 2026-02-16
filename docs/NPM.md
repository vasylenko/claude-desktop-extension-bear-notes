# Bear Notes MCP Server

Search, read, create, and update your Bear Notes from any AI assistant.

**Full documentation and source code: [claude-desktop-extension-bear-notes](https://github.com/vasylenko/claude-desktop-extension-bear-notes)**

## Key Features

- **9 MCP tools** for full Bear Notes integration
- **OCR search** across images and PDFs attached to notes
- **Date-based search** with relative dates ("yesterday", "last week", etc.)
- **Configurable new note convention** for tag placement (opt-in)
- **Local-only** — no network calls, all data stays on your Mac

## Tools

- **`bear-search-notes`** - Find notes by text content, tags, or date ranges. Includes OCR search in attachments
- **`bear-open-note`** - Read full content of a specific note including text, formatting, and metadata
- **`bear-create-note`** - Create new notes with optional title, content, and tags
- **`bear-add-text`** - Add text to an existing note at the beginning or end, optionally targeting a specific section
- **`bear-add-file`** - Attach files (images, PDFs, spreadsheets, etc.) to existing notes
- **`bear-list-tags`** - List all tags in your Bear library as a hierarchical tree with note counts
- **`bear-find-untagged-notes`** - Find notes that have no tags assigned
- **`bear-add-tag`** - Add one or more tags to an existing note
- **`bear-archive-note`** - Move a note to Bear's archive without deleting it

**Requirements**: Node.js 24.13.0+

## Quick Start - Claude Code (One Command)

```bash
claude mcp add bear-notes --transport stdio -- npx -y bear-notes-mcp@latest
```

That's it! The server will be downloaded from npm and configured automatically.

## Quick Start - Other AI Assistants

Add to your MCP configuration file:
```json
{
  "mcpServers": {
    "bear-notes": {
      "command": "npx",
      "args": ["-y", "bear-notes-mcp@latest"]
    }
  }
}
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `UI_DEBUG_TOGGLE` | `false` | Enable debug logging for troubleshooting |
| `UI_ENABLE_NEW_NOTE_CONVENTION` | `false` | Place tags right after the note title instead of at the bottom |

Example with configuration:
```json
{
  "mcpServers": {
    "bear-notes": {
      "command": "npx",
      "args": ["-y", "bear-notes-mcp@latest"],
      "env": {
        "UI_ENABLE_NEW_NOTE_CONVENTION": "true",
        "UI_DEBUG_TOGGLE": "true"
      }
    }
  }
}
```

## Advanced: Local Development Build

**Step 1: Clone and build**
```bash
git clone https://github.com/vasylenko/claude-desktop-extension-bear-notes.git
cd claude-desktop-extension-bear-notes
npm install
npm run build
```

**Step 2: Configure with local path**

For Claude Code:
```bash
claude mcp add bear-notes --transport stdio -- node /absolute/path/to/dist/main.js
```

For other AI assistants:
```json
{
  "mcpServers": {
    "bear-notes": {
      "command": "node",
      "args": ["/absolute/path/to/dist/main.js"]
    }
  }
}
```
