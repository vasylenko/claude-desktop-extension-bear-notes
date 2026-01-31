---
name: bear-notes
description: Search, read, create, and modify Bear Notes with full featured support including date filtering, tag management, and file attachments. Use when the user wants to interact with their Bear Notes library.
user-invocable: true
allowed-tools: Bash(*/bear-cli *)
---

# Bear Notes Integration

Full-featured Bear Notes integration using the Bear CLI tool.

## CLI Tool Location

The Bear CLI is located at: `scripts/bear-cli.js` (relative to this skill directory)

To execute commands, use:
```bash
node scripts/bear-cli.js <command> [options]
```

## Available Commands

### Search Notes

Search for notes with optional filters:

```bash
# Search by term
node scripts/bear-cli.js search --term "meeting notes"

# Search by tag
node scripts/bear-cli.js search --tag "work"

# Search with date filters (supports natural language)
node scripts/bear-cli.js search --term "project" --created-after "last week"
node scripts/bear-cli.js search --modified-after "today"

# Limit results
node scripts/bear-cli.js search --term "notes" --limit 10

# Find pinned notes
node scripts/bear-cli.js search --pinned

# Combine filters
node scripts/bear-cli.js search --tag "journal" --modified-after "start of last month" --limit 20
```

**Date filter examples:**
- "today", "yesterday"
- "last week", "last month"
- "start of last month", "end of last month"
- ISO format: "2024-01-15"

### Read Note Content

```bash
node scripts/bear-cli.js read <note-id>
```

Always use the note ID from search results.

### Create New Note

```bash
# With title only
node scripts/bear-cli.js create --title "My Note"

# With title and content
node scripts/bear-cli.js create --title "Meeting Notes" --text "Discussion points..."

# With tags
node scripts/bear-cli.js create --title "Daily Journal" --text "Today..." --tags "journal,personal"
```

### Add Text to Note

```bash
# Append to end (default)
node scripts/bear-cli.js add-text --id <note-id> --text "New content here"

# Prepend to beginning
node scripts/bear-cli.js add-text --id <note-id> --text "Summary" --position beginning

# Add to specific section
node scripts/bear-cli.js add-text --id <note-id> --text "New item" --header "## Tasks"
```

### Attach Files to Notes

```bash
# First encode the file to base64
base64_content=$(base64 -i /path/to/file.pdf)

# Then attach it
node scripts/bear-cli.js add-file --id <note-id> --file "$base64_content" --filename "document.pdf"
```

### List All Tags

```bash
node scripts/bear-cli.js list-tags
```

Shows hierarchical tag structure with note counts.

### Find Untagged Notes

```bash
# Find all untagged notes
node scripts/bear-cli.js find-untagged

# Limit results
node scripts/bear-cli.js find-untagged --limit 20
```

### Add Tags to Note

```bash
# Add single tag
node scripts/bear-cli.js add-tag --id <note-id> work

# Add multiple tags
node scripts/bear-cli.js add-tag --id <note-id> work important project
```

## User Request: $ARGUMENTS

Based on the user's request above, execute the appropriate Bear Notes operation using the CLI tool.

**Workflow:**

1. **Search first** when the user mentions finding/looking for notes
2. **Show results** with note IDs for the user to select
3. **Read content** when user wants to see full note
4. **Create/modify** as requested
5. **Always use note IDs** from search results, never guess

**Best Practices:**

- Use natural language date filters ("today", "last week") when appropriate
- List tags before creating notes to follow existing tag conventions
- Search before creating to avoid duplicates
- For journaling: search for today's entry first, append if exists, create if not
- Present results clearly with titles, dates, and IDs

**Error Handling:**

- If a note ID is not found, search again to get the correct ID
- If a command fails, check the error message and suggest corrections
- For file attachments, verify the file path exists before encoding

## Examples

**Daily journal entry:**
```bash
# Check if today's journal exists
node scripts/bear-cli.js search --tag "journal" --created-after "today"

# If found, append to it
node scripts/bear-cli.js add-text --id <note-id> --text "Today's entry..."

# If not found, create new one
node scripts/bear-cli.js create --title "Journal - 2024-01-31" --text "Today's entry..." --tags "journal,journal/2024"
```

**Meeting notes workflow:**
```bash
# Create meeting note
node scripts/bear-cli.js create --title "Meeting - Team Sync - Jan 31" --tags "meetings,meetings/2024,work"

# Later, add action items
node scripts/bear-cli.js add-text --id <note-id> --text "## Action Items\n- Follow up with..."
```

**Research and organization:**
```bash
# Find untagged notes that need organizing
node scripts/bear-cli.js find-untagged --limit 10

# Add appropriate tags
node scripts/bear-cli.js add-tag --id <note-id> research technology ai
```
