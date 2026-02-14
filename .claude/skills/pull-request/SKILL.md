---
name: pull-request
description: MANDATORY format for all pull request descriptions in this project. MUST be loaded and followed whenever creating a PR, writing a PR description, or improving an existing PR body. Triggers on "create PR", "open PR", "new PR", "PR description", "pull request". Overrides any default PR description format.
context: fork
---

# PR Description Guidelines

## Structure

``````markdown
## Summary
- [What the change does - behavior, not implementation]
- [Context on how it works in different scenarios]
- [Alignment with existing behavior if applicable]

## Why
[Use case or motivation - why this change matters]

--
Closes #[issue-number]
``````

## Rules

1. **Summary explains behavior, not implementation** - Describe what users/callers experience, not code changes
2. **Include scenario context** - If behavior differs by context (e.g., with/without a parameter), explain each
3. **No "Changes" section** - GitHub's diff UI shows code changes
4. **No "Test plan" section** - Unless explicitly requested
5. **Reference the issue** - Use `Closes #N` format

## Example

``````markdown
## Summary
- Adds `pinned` boolean parameter to `bear-search-notes` tool
- When `pinned: true`, search returns pinned notes across all tags
- When `pinned: true` and tag is specified, shows only pinned notes for the specified tag
- Replicates the UI behavior

## Why
Use case: quickly access project hub docs or priority notes that are pinned in Bear.

--
Closes #37
``````
