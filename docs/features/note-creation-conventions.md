# Feature: Note Creation Conventions

## Problem
When creating notes via `bear-create-note`, tags end up at the bottom of the note — Bear's `/create` API appends tags from the `tags` URL param at the end, but the convention is tags immediately after the title.

Reference: [GitHub Issue #44](https://github.com/vasylenko/claude-desktop-extension-bear-notes/issues/44)

## Solution
Process the `text` and `tags` inputs in the `bear-create-note` handler before passing them to Bear's API: embed tags as inline Bear tag syntax at the start of the text body, and don't pass `tags` as a URL param.

Controlled by a feature flag (OFF by default) so users can opt in.

## UX Design

### Current behavior (default)
```
┌──────────────────────────────┐
│ # Meeting Notes              │  ← Bear title (from `title` param)
│                              │
│ Discussed roadmap...         │  ← Note body
│                              │
│ #work #meetings              │  ← Tags at the bottom (from `tags` param)
└──────────────────────────────┘
```

### Behavior with convention enabled
```
┌──────────────────────────────┐
│ # Meeting Notes              │  ← Bear title (from `title` param)
│ #work #meetings              │  ← Tags right after title (embedded in text)
│ ---                          │  ← Horizontal rule separating tags from body
│ Discussed roadmap...         │  ← Note body
└──────────────────────────────┘
```

## Implementation

### Feature flag

OFF by default, opt-in via user config. Follows the existing pattern: `user_config` in `manifest.json` → mapped to env var in `mcp_config.env` → read in code.

```
  manifest.json:
    user_config.enable_new_note_convention → boolean, default: false
    mcp_config.env.UI_ENABLE_NEW_NOTE_CONVENTION → "${user_config.enable_new_note_convention}"

  config.ts:
    ENABLE_NOTE_CONVENTIONS = process.env.UI_ENABLE_NEW_NOTE_CONVENTION === 'true'
```

When disabled (default), `bear-create-note` passes title/text/tags directly to Bear's URL params (current behavior).

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
  Are tags provided and valid?
    ├─ YES → Convert comma-separated tags to Bear tag syntax
    │        Prepend tag line + "---" separator to text
    │        Set tags to undefined (so buildBearUrl won't add as URL param)
    └─ NO  → Keep text as-is, set tags to undefined
         │
         ▼
  Call buildBearUrl('create', { title, text: processedText })
  ──── NOTE: `tags` is undefined, so not passed as URL param ────
```

### Tag conversion logic

```
  Input: "work,project/planning,urgent"
         │
         ▼
  Split by comma → ["work", "project/planning", "urgent"]
         │
         ▼
  Trim each, strip leading/trailing '#', filter empty
         │
         ▼
  Tag contains '/' or spaces?
    ├─ YES → Wrap as "#tag#" (closing hash required)
    └─ NO  → Wrap as "#tag" (plain Bear tag syntax)
         │
         ▼
  Filter empty results (handles garbage like "###")
         │
         ▼
  Join with space → "#work #project/planning# #urgent"
```

The closing `#` is only needed for tags containing `/` (nested) or spaces — plain `#tag` is standard Bear convention for simple tags.

### Schema description updates

Updated `text` param description to guide LLMs:
- Tells them not to include the title as a heading in text (Bear adds it automatically)

The `tags` param description is kept neutral (no mention of placement) since placement depends on whether the feature flag is enabled.

## Files changed

| File | Change |
|------|--------|
| `src/note-conventions.ts` | **New file** — `applyNoteConventions()` function and `toBearTagSyntax()` helper |
| `src/main.ts` | Modify `bear-create-note` handler: conditionally apply conventions before `buildBearUrl` call, update `text` schema description |
| `src/config.ts` | Add `ENABLE_NOTE_CONVENTIONS` constant (reads `UI_ENABLE_NEW_NOTE_CONVENTION` env var) |
| `manifest.json` | `enable_new_note_convention` in `user_config`, mapped to `UI_ENABLE_NEW_NOTE_CONVENTION` env var |

## Edge Cases

| Scenario | Handling |
|----------|----------|
| `text` is empty/undefined, tags provided | Tag line becomes the entire text body (no `---` separator since there's no body to separate from) |
| `text` provided, no tags | Text passed through unchanged |
| Tags contain `#` characters already | Strip leading/trailing `#` before wrapping |
| Tags with spaces (e.g., "my tag") | Use closing `#`: `#my tag#` |
| Tags with `/` (nested, e.g., "work/meetings") | Use closing `#`: `#work/meetings#` |
| Simple single-word tags (e.g., "urgent") | Plain `#urgent` — no closing hash needed |
| All tags are invalid (e.g., "###,,,") | Text passed through unchanged, no empty tag line |
| Feature disabled (default) | Complete pass-through, no modification |

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Embed tags in text body instead of using Bear's `tags` URL param | Bear's `tags` param always places tags at the end of the note. Embedding as `#tag` / `#tag#` in text places them exactly where we want (after title) and Bear auto-recognizes them as proper indexed tags |
| Only use closing `#` for tags with `/` or spaces | Closing hash is required for nested tags and multi-word tags, but plain `#tag` is standard Bear convention for simple tags — looks more natural in notes |
| Extract logic into `src/note-conventions.ts` | Improves testability and keeps the handler in `main.ts` focused on orchestration |
| Feature flag OFF by default (opt-in) | This changes how notes look, so users should explicitly enable it. Avoids surprising existing users with different tag placement |
| Keep `tags` schema description neutral | The description is always visible to the LLM regardless of the feature flag state, so it shouldn't claim specific placement behavior |
| Update `text` schema description to discourage duplicate titles | Guides LLMs not to include `# Title` in text body since Bear adds it automatically from the `title` param |
| Double `.filter(Boolean)` in tag pipeline | First filter removes empty strings from splitting; second filter removes empty results from `toBearTagSyntax` (e.g., input `"###"` strips to empty) |
| `---` separator between tags and body | Bear renders `---` as a horizontal rule in markdown. Visually separates metadata (tags) from content. Only added when both tags and text are present |
