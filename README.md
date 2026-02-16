[![Supply Chain](https://github.com/vasylenko/claude-desktop-extension-bear-notes/actions/workflows/ci.yml/badge.svg)](https://github.com/vasylenko/claude-desktop-extension-bear-notes/actions/workflows/ci.yml)
[![Snyk](https://snyk.io/test/github/vasylenko/claude-desktop-extension-bear-notes/badge.svg)](https://snyk.io/test/github/vasylenko/claude-desktop-extension-bear-notes)
[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/34d7b12a-3983-40a3-876f-3cdd2ccfe3f2)

# Bear Notes Claude Extension (aka MCP Bundle)

Search, read, create, and update your Bear Notes directly from Claude conversations.

This **local-only** extension reads Bear's SQLite database for fast search with OCR support, and uses Bear's native API for writes. Complete privacy: no external connections, all processing on your Mac.

Example prompts:

> Find my Bear notes about the last trip to Norway

> Go through my untagged notes and suggest how to tag them

> Summarize our conversation and create a new Bear note with it

![](./docs/demo.gif)

## ✨ Key Features

- **9 MCP tools** for searching, reading, creating, updating, tagging, and archiving notes
- **OCR search** — finds text inside attached images and PDFs
- **Date-based search** with relative dates ("yesterday", "last week", "start of last month")
- **Tag management** — list tags as a tree, find untagged notes, add tags to notes
- **New note convention** (opt-in) — place tags right after the title instead of at the bottom
- **Local-only** — no network calls, all data stays on your Mac

> [!NOTE]
> Complete privacy (except the data you send to your AI provider when using an AI assistant such as Claude, of course): this extension makes no external connections. All processing happens locally on your Mac using Bear's own database and API. There is no extra telemetry, usage statistics or anything like that.

## 📦 Installation

### Claude Desktop Extension

**Prerequisites**: [Bear app](https://bear.app/) must be installed and [Claude Desktop](https://claude.ai/download) must be installed.

1. Download the latest `bear-notes-mcpb.mcpb` extension from releases
2. Make sure your Claude Desktop is running (start if not)
3. Doubleclick on the extension file – Claude Desktop should show you the installation prompt

    If doubleclick does not work for some reason, then open Claude -> Settings -> Extensions -> Advanced Settings -> click "Install Extension".

4. DONE!

Ask Claude to search your Bear notes with a query like "Search my Bear notes for 'meeting'" - you should see your notes appear in the response!

### Standalone MCP Server

Want to use this Bear Notes MCP server with Claude Code, Cursor, Codex, or other AI assistants?

**Requirements**: Node.js 24.13.0+

#### Claude Code (one command)

```bash
claude mcp add bear-notes --transport stdio -- npx -y bear-notes-mcp@latest
```

#### Other AI Assistants

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

**More installation options and local development setup — [NPM.md](./docs/NPM.md)**

## 🛠️ Tools

- **`bear-search-notes`** - Find notes by text content, tags, or date ranges. Includes OCR search in attachments
- **`bear-open-note`** - Read full content of a specific note including text, formatting, and metadata
- **`bear-create-note`** - Create new notes with optional title, content, and tags
- **`bear-add-text`** - Add text to an existing note at the beginning or end, optionally targeting a specific section
- **`bear-add-file`** - Attach files (images, PDFs, spreadsheets, etc.) to existing notes
- **`bear-list-tags`** - List all tags in your Bear library as a hierarchical tree with note counts
- **`bear-find-untagged-notes`** - Find notes that have no tags assigned
- **`bear-add-tag`** - Add one or more tags to an existing note
- **`bear-archive-note`** - Move a note to Bear's archive without deleting it

## ⚙️ Configuration

### Debug Logging

Enable verbose logging for troubleshooting.

- **Claude Desktop**: Settings → Extensions → Configure (next to Bear Notes) → toggle "Debug Logging" → Save → Restart Claude
- **Standalone MCP server**: set environment variable `UI_DEBUG_TOGGLE=true`

### New Note Convention

By default, Bear places tags at the bottom of a note when created via API. Enable this option to place tags right after the title instead, separated by a horizontal rule.

<details>
<summary>See note structure with this convention enabled</summary>

```
┌──────────────────────────────┐
│ # Meeting Notes              │  ← Note title
│ #work #meetings              │  ← Tags right after title
│                              │
│ ---                          │  ← Separator
│                              │
│ Lorem Ipsum...               │  ← Note body
└──────────────────────────────┘
```

</details>

> [!TIP]
> This convention is **disabled by default** — it's opt-in so existing behavior is preserved.

- **Claude Desktop**: Settings → Extensions → Configure (next to Bear Notes) → toggle "New Note Convention" → Save → Restart Claude
- **Standalone MCP server**: set environment variable `UI_ENABLE_NEW_NOTE_CONVENTION=true`

Example standalone configuration with the convention enabled:
```json
{
  "mcpServers": {
    "bear-notes": {
      "command": "npx",
      "args": ["-y", "bear-notes-mcp@latest"],
      "env": {
        "UI_ENABLE_NEW_NOTE_CONVENTION": "true"
      }
    }
  }
}
```

## Technical Details

This server reads your Bear Notes SQLite database directly for search/read operations and uses Bear's X-callback-URL API for write operations. All data processing happens locally on your machine with no external network calls.

### Platforms Supported
macOS only because Bear desktop works only on macOS.

### Logs
- MCP server logs go into `~/Library/Logs/Claude/main.log`, look for `bear-notes-mcp`
- MCP transport logs go to `~/Library/Logs/Claude/mcp-server-Bear\ Notes.log`

## FAQ

### Could this steal my data?
**No**. Extension only reads Bear's local database (same data Bear app shows you) and uses Bear's application native API to add text to the notes. No network transmission, no external servers.

### Why SQLite and not just a native Bear app's x-callback-url API?

For read operations (search/open), the x-callback-url API returns the note data in `x-success` response: that would require a server or custom binary to handle x-success responses - both risky and fragile. Direct SQLite read-only access is simpler and more reliable for searching and reading notes.

### Why native Node.js SQLite instead of third-party packages?

This avoids shipping an SQLite binary from third-party node packages, which poses supply chain risks and blocks the Claude extension from running on macOS.

Anthropic does not sign third-party SQLite binaries (obviously), causing macOS security systems to flag that the Claude process from a binary signed by Anthropic is trying to run another binary signed by a third party. As a result, Claude cannot run the extension.

### When I install the extension, I see a red warning: "Installing will grant access to everything on your computer." - what does this mean?

This is how Claude for Desktop reacts to the fact that this extension needs access to the Bear SQLite database on your Mac.

Claude warning system does not distinguish between the need to access only one file (what the extension does) versus the need to access all files (this is NOT what the extension does).

One of the ways to validate this is asking your Claude to analyze the codebase (it is pretty small) before installing the extension and tell you.

### How can I report a bug or contribute?

Use issues or discussions! I'd be glad to see your feedback or suggestions, or your help to make this extension better! ❤️

## Staying Up To Date

Consider subscribing to release announcements to know when a new version of the extension is released:

![](./docs/stay-updated.png)

I also post to [reddit.com/r/bearapp/](https://www.reddit.com/r/bearapp/) when there's a new release.

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/vasylenko-claude-desktop-extension-bear-notes-badge.png)](https://mseep.ai/app/vasylenko-claude-desktop-extension-bear-notes)
