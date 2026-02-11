# Feature: Note Creation Conventions

## Problem
When creating notes via `bear-create-note`, two formatting issues occur:
1. The title appears twice — Bear auto-creates an H1 from the `title` param, and the LLM also includes `# Title` at the start of the text body
2. Tags end up at the bottom of the note — Bear's `/create` API appends tags from the `tags` URL param at the end, but the convention is tags immediately after the title

Reference: [GitHub Issue #44](https://github.com/vasylenko/claude-desktop-extension-bear-notes/issues/44)

## Solution
Process the `text` and `tags` inputs in the `bear-create-note` handler before passing them to Bear's API: strip duplicate title headings and embed tags as inline Bear tag syntax at the start of the text body.

## UX Design

### Current behavior (broken)
```
┌──────────────────────────────┐
│ # Meeting Notes              │  ← Bear title (from `title` param)
│ # Meeting Notes              │  ← Duplicate H1 (from `text` param)
│                              │
│ Discussed roadmap...         │  ← Note body
│                              │
│ #work #meetings              │  ← Tags at the bottom (from `tags` param)
└──────────────────────────────┘
```

### Desired behavior
```
┌──────────────────────────────┐
│ # Meeting Notes              │  ← Bear title (from `title` param)
│ #work #meetings               │  ← Tags right after title (embedded in text)
│                              │
│ Discussed roadmap...         │  ← Note body
└──────────────────────────────┘
```

## Implementation

### Feature flag

ON by default, can be disabled via env var. Follows the existing pattern: `user_config` in `manifest.json` → mapped to env var in `mcp_config.env` → read in code.

```
  manifest.json:
    user_config.note_conventions → boolean, default: true
    mcp_config.env.UI_NOTE_CONVENTIONS → "${user_config.note_conventions}"

  config.ts:
    ENABLE_NOTE_CONVENTIONS = process.env.UI_NOTE_CONVENTIONS !== 'false'
```

When disabled, `bear-create-note` passes title/text/tags directly to Bear's URL params (current behavior).

### Text processing flow (in `bear-create-note` handler)

```
  Receive title, text, tags
         │
         ▼
  Is ENABLE_NOTE_CONVENTIONS off?
    ├─ YES → Skip processing, pass through as-is
    └─ NO  → Continue below
         │
         ▼
  Is title provided AND text starts with "# {title}"?
    ├─ YES → Strip the leading H1 line from text
    └─ NO  → Keep text as-is
         │
         ▼
  Are tags provided?
    ├─ YES → Convert comma-separated tags to Bear tag syntax
    │        Prepend tag line to text (with newline separator)
    └─ NO  → Keep text as-is
         │
         ▼
  Call buildBearUrl('create', { title, text: processedText })
  ──── NOTE: Do NOT pass `tags` as URL param ────
```

### Tag conversion logic

```
  Input: "work,project/planning,urgent"
         │
         ▼
  Split by comma → ["work", "project/planning", "urgent"]
         │
         ▼
  Trim each, strip leading/trailing '#'
         │
         ▼
  Tag contains '/' or spaces?
    ├─ YES → Wrap as "#tag#" (closing hash required)
    └─ NO  → Wrap as "#tag" (plain Bear tag syntax)
         │
         ▼
  Join with space → "#work #project/planning# #urgent"
```

The closing `#` is only needed for tags containing `/` (nested) or spaces — plain `#tag` is standard Bear convention for simple tags.

### Title stripping logic

```
  Input text: "# Meeting Notes\n\nDiscussed roadmap..."
  Input title: "Meeting Notes"
         │
         ▼
  Does text start with "# Meeting Notes"?
    ├─ YES → Remove "# Meeting Notes" and leading whitespace
    │        Result: "Discussed roadmap..."
    └─ NO  → Return text unchanged
```

Simple string prefix comparison — no regex needed.

### Schema description updates

Update `text` param description to guide LLMs:
- Tell them not to include the title as a heading in text (Bear adds it automatically)

Update `tags` param description:
- Document that tags will be placed right after the title

## Files to change

| File | Change |
|------|--------|
| `src/main.ts` | Modify `bear-create-note` handler: add text processing before `buildBearUrl` call, update tool and schema descriptions |
| `src/config.ts` | Add `ENABLE_NOTE_CONVENTIONS` constant (reads env var) |
| `manifest.json` | Add `note_conventions` to `user_config` and map to `UI_NOTE_CONVENTIONS` env var |

## Edge Cases

| Scenario | Handling |
|----------|----------|
| `text` is empty/undefined, tags provided | Tag line becomes the entire text body |
| `text` provided, no tags | Only title stripping applies |
| No title, text starts with H1 | No stripping — nothing to compare against |
| Title matches H1 case-insensitively | Use case-insensitive comparison for stripping |
| Tags contain `#` characters already | Strip leading/trailing `#` before wrapping |
| Tags with spaces (e.g., "my tag") | Use closing `#`: `#my tag#` |
| Tags with `/` (nested, e.g., "work/meetings") | Use closing `#`: `#work/meetings#` |
| Simple single-word tags (e.g., "urgent") | Plain `#urgent` — no closing hash needed |
| H1 title has trailing whitespace | Trim before comparing |
| Text has `## Title` (H2) not `# Title` (H1) | Only strip H1 (`#` + space), not H2+ |

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Embed tags in text body instead of using Bear's `tags` URL param | Bear's `tags` param always places tags at the end of the note. Embedding as `#tag#` in text places them exactly where we want (after title) and Bear auto-recognizes them as proper indexed tags |
| Only use closing `#` for tags with `/` or spaces | Closing hash is required for nested tags and multi-word tags, but plain `#tag` is standard Bear convention for simple tags — looks more natural in notes |
| Strip H1 via string prefix match, not regex | Simpler, no need for regex escaping of special characters in titles (parentheses, periods, etc.) |
| Keep all logic in the handler, no new helper functions | The processing is ~15 lines of straightforward string manipulation. A separate function would be over-engineering for a single consumer |
| Case-insensitive title comparison | LLMs may capitalize differently than the user's title param |
| Update schema descriptions as guidance for LLMs | Belt-and-suspenders: schema guides correct LLM behavior, code handles it defensively when LLMs don't follow guidance |
| Feature flag ON by default, disable via env var | Users who prefer Bear's default tag placement or don't want title stripping can opt out. Follows existing `user_config` → env var pattern from debug toggle |
