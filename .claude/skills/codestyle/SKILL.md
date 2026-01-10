---
name: codestyle
description: Check code style compliance. Use when asked to validate code style, check naming conventions, review comments quality, or ensure file naming follows conventions. Works on whole codebase or specific changes (branch, PR, uncommitted).
---

# Code Style Checker

## Scope

Determine what to check based on user request:
- **Specific changes**: Compare branch with main (`git diff main...HEAD`), or check uncommitted changes (`git diff`)
- **Whole codebase**: Scan `./src` directory

## Rules

1. **Naming**: Descriptive, self-documenting names for functions and variables
2. **Files**: Lowercase with hyphens, test files with `.test.ts` suffix
3. **Comments**: JSDoc for public APIs; inline comments explain "why", never "what"

## Workflow

1. Identify scope (specific changes vs whole codebase)
2. Create TODO items for each rule
3. Validate each rule separately
4. Fix deviations
5. Run `task build && task style` to verify
