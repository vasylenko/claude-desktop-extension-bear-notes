---
name: kissdryer
description: Validate code for KISS and DRY principles. Use when asked to check for simplification opportunities, reduce duplication, review code complexity, or ensure maintainability. Works on whole codebase or specific changes (branch, PR, uncommitted).
---

# KISS and DRY Validator

## Scope

Determine what to check based on user request:
- **Specific changes**: Compare branch with main (`git diff main...HEAD`)
- **Whole codebase**: Scan `./src` directory

## Workflow

1. Read [references/wisdom.md](references/wisdom.md) to internalize KISS/DRY principles
2. Identify scope and gather code to analyze
3. Use sequential thinking to evaluate each file/change
4. Generate report

## Output Format

```markdown
1. **KISS**: <filename> – problem – solution – justification

2. **DRY**: <filename> – problem – solution – justification

...

<Most impactful improvements with justification>

**DISCLAIMER**: Suggestions, not rules. Some may be misleading or wrong.
```

## Example

```markdown
1. **DRY**: index.ts – ENV variable check on lines 12, 45, 78 – extract to helper function – makes ENV checks reusable and reduces noise in main logic

2. **KISS**: users.ts – complex ternary in return statement of 'checkUserStatus' – move expression to separate block – nested ternaries are hard to follow

<Most impactful: #1 - repeated ENV checks appear in 3 files, consolidating reduces maintenance burden>

**DISCLAIMER**: Suggestions, not rules. Some may be misleading or wrong.
```
