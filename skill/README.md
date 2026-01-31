# Bear Notes Claude Skill

A Claude skill that provides full Bear Notes integration without requiring MCP server infrastructure.

## What This Is

This is a **Claude Skill** that wraps the Bear Notes MCP server code as a CLI tool. It provides all the same functionality as the MCP server but works in environments where MCP servers are restricted.

## How It Works

```
Claude Skill (SKILL.md)
    ↓ (calls via bash)
CLI Wrapper (scripts/bear-cli.js)
    ↓ (imports and uses)
MCP Server Code (../dist/*.js)
    ↓ (accesses)
Bear Database + URL Scheme
```

The CLI wrapper imports the compiled MCP server code, so all the sophisticated logic (date parsing, validation, error handling) is preserved.

## Installation

### Quick Install

From the project root directory:

```bash
# Build the MCP server code
npm run build

# Install the skill
npm run skill:install
```

This will copy the skill to `~/.claude/skills/bear-notes/` with all dependencies.

### Manual Installation

```bash
# Build the project
npm run build

# Create skill directory
mkdir -p ~/.claude/skills/bear-notes

# Copy skill files
cp -r skill/* ~/.claude/skills/bear-notes/

# Copy compiled code
cp -r dist ~/.claude/skills/bear-notes/

# Install dependencies
cd ~/.claude/skills/bear-notes
npm install
```

### Verify Installation

```bash
# Test the CLI
node ~/.claude/skills/bear-notes/scripts/bear-cli.js --help

# Try a search
node ~/.claude/skills/bear-notes/scripts/bear-cli.js search --term "test"
```

## Usage in Claude

### Invoke the Skill

```
/bear-notes search for my meeting notes from last week
```

```
/bear-notes create a new journal entry for today
```

```
/bear-notes list all my tags
```

### Automatic Usage

Claude will also use the skill automatically when you ask about Bear Notes:

```
Show me all notes tagged with "work" from this month
```

```
Create a new note for today's standup meeting
```

## Features

All MCP server features are available:

✅ **Search** - Full-text search with date filtering
✅ **Date Filters** - Natural language ("today", "last week") and ISO format
✅ **Tag Management** - Hierarchical tag listing and filtering
✅ **Create Notes** - With title, content, and tags
✅ **Modify Notes** - Add text at beginning/end, target sections
✅ **File Attachments** - Attach PDFs, images, Excel files
✅ **OCR Search** - Searches text in attached images and PDFs
✅ **Untagged Notes** - Find and organize notes without tags

## Advantages Over MCP Server

- ✅ Works in environments where MCP servers are restricted
- ✅ No MCP configuration needed
- ✅ Same functionality as the MCP server

## Advantages Over Bash-Only Skills

- ✅ All sophisticated date parsing logic preserved
- ✅ Proper error handling and validation
- ✅ Clean, structured output
- ✅ Same reliability as the MCP server
- ✅ Easy to maintain (updates to MCP code flow through)

## Direct CLI Usage

You can also use the CLI directly from the command line:

```bash
# Make it easier to run
alias bear-cli="node ~/.claude/skills/bear-notes/scripts/bear-cli.js"

# Then use it
bear-cli search --term "project" --tag "work" --limit 10
bear-cli read ABC123-DEF456
bear-cli create --title "My Note" --text "Content" --tags "tag1,tag2"
bear-cli list-tags
```

See `scripts/bear-cli.js --help` for all available commands.

## Updating the Skill

When the MCP server code is updated:

```bash
# In project root
npm run build
npm run skill:install
```

This rebuilds and reinstalls the skill with the latest code.

## File Structure

```
skill/
├── SKILL.md              # Skill instructions for Claude
├── package.json          # Dependencies
├── README.md             # This file
└── scripts/
    └── bear-cli.js       # CLI wrapper (imports ../dist/ code)

After installation to ~/.claude/skills/bear-notes/:
├── SKILL.md
├── package.json
├── scripts/
│   └── bear-cli.js
├── dist/                 # Compiled MCP code (copied during install)
│   ├── notes.js
│   ├── database.js
│   ├── bear-urls.js
│   └── ...
└── node_modules/         # Installed dependencies
```

## Troubleshooting

**"Cannot find module" errors:**
- Ensure you ran `npm run build` before installing
- Verify `dist/` directory exists in `~/.claude/skills/bear-notes/`
- Run `npm install` in the skill directory

**"Database not found" errors:**
- Ensure Bear Notes is installed
- Check database exists at: `~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite`

**Bear operations fail:**
- Verify Bear Notes is installed and running
- Check Bear's x-callback-url scheme is enabled

**Skill not showing in Claude:**
- Verify files are in `~/.claude/skills/bear-notes/`
- Check SKILL.md has proper frontmatter
- Restart Claude Code if needed

## License

MIT - Same as the parent Bear Notes MCP Server project
