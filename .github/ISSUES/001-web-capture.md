# feat: Add web capture tool to create notes from URLs

## User Story

As a user researching topics online, I want to save web page content directly to Bear so I can reference articles, documentation, and other web resources without manual copy-paste.

## Problem

Currently, saving web content to Bear requires:
1. Manually copying content from web pages
2. Creating a new note
3. Pasting and formatting content

This breaks the research flow and loses formatting/context from the original page.

## Proposed Solution

Add a `bear-grab-url` tool that creates a Bear note from a URL. Bear handles fetching and formatting the web content automatically.

### Tool Specification

```typescript
'bear-grab-url': {
  title: 'Capture Web Page',
  description: 'Create a new Bear note from a web page URL. Bear fetches and formats the content automatically.',
  inputSchema: {
    url: z.string().url().describe('URL of the web page to capture'),
    tags: z.string().optional().describe('Tags separated by commas'),
    pin: z.boolean().optional().describe('Pin the captured note')
  }
}
```

## Implementation Plan

1. Add `url` and `pin` parameters to `BearUrlParams` interface in `bear-urls.ts`
2. Register new `bear-grab-url` tool in `main.ts` following existing patterns
3. Build URL using `buildBearUrl('grab-url', { url, tags, pin: pin ? 'yes' : undefined })`
4. Execute via existing `executeBearXCallbackApi()` function
5. Add tests

### Bear URL Scheme Reference

```
bear://x-callback-url/grab-url?url={url}&tags={tags}&pin={yes|no}
```

## Acceptance Criteria

- [ ] Tool captures web page content into a new Bear note
- [ ] Optional tags are applied to the captured note
- [ ] Optional pin parameter pins the note
- [ ] Error handling for invalid URLs
- [ ] Tests pass
