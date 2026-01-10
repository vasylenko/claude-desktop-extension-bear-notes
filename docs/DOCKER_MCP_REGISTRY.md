# Docker MCP Registry

How to submit and maintain this MCP server in the [Docker MCP Registry](https://github.com/docker/mcp-registry).

## Overview

Docker MCP Registry is a catalog of MCP servers available through Docker Desktop's MCP Toolkit. Docker builds and hosts images under the `mcp/` namespace after approval.

## Submission

1. Fork [docker/mcp-registry](https://github.com/docker/mcp-registry)

2. Create `servers/bear-notes/` directory

3. Create `server.yaml`:

```yaml
name: bear-notes
image: mcp/bear-notes
type: server
meta:
  category: productivity
  tags:
    - bear
    - notes
    - markdown
    - productivity
    - macos
about:
  title: Bear Notes
  description: >-
    Bear Notes MCP server providing comprehensive integration for creating,
    searching, reading, and modifying notes in Bear app. Supports full-text
    search including OCR content from attached images and PDFs, tag hierarchy
    management, and note organization. Requires macOS with Bear app installed.
  icon: https://raw.githubusercontent.com/vasylenko/claude-desktop-extension-bear-notes/main/assets/icon.png
source:
  project: https://github.com/vasylenko/claude-desktop-extension-bear-notes
  branch: v2.1.1              # release tag
  commit: abc123def456...     # full commit hash
  dockerfile: Dockerfile
config:
  description: >-
    Mount the Bear Notes database directory from your macOS host.
    The database is located at ~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/
  env:
    BEAR_DB_PATH:
      description: Path to the Bear Notes SQLite database file inside the container
      default: /data/database.sqlite
compatibility:
  platforms:
    - darwin
```

4. Create `tools.json`:

```json
[
  {
    "name": "bear-open-note",
    "description": "Read the full text content of a Bear note from your library.",
    "arguments": [
      {"name": "identifier", "type": "string", "desc": "Note ID from bear-search-notes"}
    ]
  },
  {
    "name": "bear-create-note",
    "description": "Create a new note in your Bear library.",
    "arguments": [
      {"name": "title", "type": "string", "desc": "Note title"},
      {"name": "text", "type": "string", "desc": "Note content in markdown"},
      {"name": "tags", "type": "string", "desc": "Comma-separated tags"}
    ]
  },
  {
    "name": "bear-search-notes",
    "description": "Find notes by text content, tags, or date ranges.",
    "arguments": [
      {"name": "term", "type": "string", "desc": "Search text"},
      {"name": "tag", "type": "string", "desc": "Tag filter"},
      {"name": "limit", "type": "number", "desc": "Max results (default: 50)"}
    ]
  },
  {
    "name": "bear-add-text",
    "description": "Add text to an existing Bear note.",
    "arguments": [
      {"name": "id", "type": "string", "desc": "Note ID"},
      {"name": "text", "type": "string", "desc": "Text to add"},
      {"name": "position", "type": "string", "desc": "'beginning' or 'end'"}
    ]
  },
  {
    "name": "bear-add-file",
    "description": "Attach a file to an existing Bear note.",
    "arguments": [
      {"name": "base64_content", "type": "string", "desc": "Base64-encoded file"},
      {"name": "filename", "type": "string", "desc": "Filename with extension"},
      {"name": "id", "type": "string", "desc": "Note ID"}
    ]
  },
  {
    "name": "bear-list-tags",
    "description": "List all tags in your Bear library.",
    "arguments": []
  },
  {
    "name": "bear-find-untagged-notes",
    "description": "Find notes without tags.",
    "arguments": [
      {"name": "limit", "type": "number", "desc": "Max results (default: 50)"}
    ]
  },
  {
    "name": "bear-add-tag",
    "description": "Add tags to an existing Bear note.",
    "arguments": [
      {"name": "id", "type": "string", "desc": "Note ID"},
      {"name": "tags", "type": "array", "desc": "Tag names without #"}
    ]
  }
]
```

5. Submit PR to `docker/mcp-registry`

## Releasing Updates

Each version update requires a PR to the registry.

1. Create GitHub release with tag (e.g., `v2.2.0`)

2. Get commit hash: `git rev-parse v2.2.0`

3. Update `server.yaml` in registry fork with new `branch` and `commit`

4. Update `tools.json` if tools changed

5. Submit PR
