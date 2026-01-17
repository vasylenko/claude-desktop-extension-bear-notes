# Bear Notes MCP Server

Search, read, and update your Bear Notes

Want to use this Bear Notes MCP server with Claude Code, Cursor, Codex, or other AI assistants? You can run it as a standalone MCP server.

**Read more about the project here -- [claude-desktop-extension-bear-notes](https://github.com/vasylenko/claude-desktop-extension-bear-notes)**

## Tools

- **`bear-search-notes`** - Find notes by text content or tags, returns list with IDs for further actions
- **`bear-open-note`** - Read full content of a specific note including text, formatting, and metadata
- **`bear-create-note`** - Create new notes with optional title, content, and tags
- **`bear-add-text`** - Add text to an existing note at the beginning or end, optionally targeting a specific section
- **`bear-add-file`** - Attach files (images, PDFs, spreadsheets, etc.) to existing notes
- **`bear-list-tags`** - List all tags in your Bear library as a hierarchical tree with note counts
- **`bear-find-untagged-notes`** - Find notes that have no tags assigned
- **`bear-add-tag`** - Add one or more tags to an existing note

**Requirements**: Node.js 22.13.0+

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
