# Bear Notes MCP Server

Search, read, and update your Bear Notes

Want to use this Bear Notes MCP server with Claude Code, Cursor, Codex, or other AI assistants? You can run it as a standalone MCP server.

**Read more about the project here -- [claude-desktop-extension-bear-notes](https://github.com/vasylenko/claude-desktop-extension-bear-notes)**

**Requirements**: Node.js 22.13.0+

### Quick Start - Claude Code (One Command)

**For Node.js 22.13.0+ / 23.4.0+ / 24.x+ / 25.x+ (recommended):**
```bash
claude mcp add bear-notes --transport stdio -- npx -y bear-notes-mcp@latest
```

**For Node.js 22.5.0-22.12.x or 23.0.0-23.3.x (older versions):**
```bash
claude mcp add bear-notes --transport stdio --env NODE_OPTIONS="--experimental-sqlite" -- npx -y bear-notes-mcp@latest
```

That's it! The server will be downloaded from npm and configured automatically.

### Quick Start - Other AI Assistants

**Check your Node.js version:** `node --version`

**For Node.js 22.13.0+ / 23.4.0+ / 24.x+ / 25.x+ (recommended):**
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

**For Node.js 22.5.0-22.12.x or 23.0.0-23.3.x (older versions):**
```json
{
  "mcpServers": {
    "bear-notes": {
      "command": "npx",
      "args": ["-y", "bear-notes-mcp@latest"],
      "env": {
        "NODE_OPTIONS": "--experimental-sqlite"
      }
    }
  }
}
```

### Advanced: Local Development Build

**Step 1: Clone and build**
```bash
git clone https://github.com/vasylenko/claude-desktop-extension-bear-notes.git
cd claude-desktop-extension-bear-notes
npm install
npm run build
```

**Step 2: Configure with local path**

For Claude Code (Node.js 22.13.0+):
```bash
claude mcp add bear-notes --transport stdio -- node /absolute/path/to/dist/main.js
```

For Claude Code (Node.js 22.5.0-22.12.x):
```bash
claude mcp add bear-notes --transport stdio -- node --experimental-sqlite /absolute/path/to/dist/main.js
```

For other AI assistants (Node.js 22.13.0+):
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

For other AI assistants (Node.js 22.5.0-22.12.x):
```json
{
  "mcpServers": {
    "bear-notes": {
      "command": "node",
      "args": ["--experimental-sqlite", "/absolute/path/to/dist/main.js"]
    }
  }
}
```