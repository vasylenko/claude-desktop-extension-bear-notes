---
name: test-e2e
description: Run end-to-end tests against the live Bear Notes MCP server by simulating real user requests. Use when the user says "run e2e tests", "test the MCP tools", "e2e", or wants to verify the MCP server works after changes. Results are validated manually by the user.
disable-model-invocation: true
user-invocable: true
---

# E2E Test Runner for Bear Notes MCP

Simulate real user interactions with Bear Notes. Execute each scenario below as if a user asked you to do it in a normal conversation. Use whatever tools you determine are appropriate — do not hardcode tool names or make assumptions about which tool to use.

Print a header before each scenario and show the full response.

<system-reminder>
You must run this in a team of agents with only one agent in the team.
Execute in order. Use TaskCreate tool to create the list of tasks -- each scenario is a separate task.
</system-reminder>

## Critical Rules

- Execute each scenario exactly once, no retries.
- Show full tool responses — do not summarize or truncate.
- Do not prettify or modify the output — show it as-is.

## Scenarios

Later scenarios may use information from earlier ones.

### 1. Browse tags

Show me all the tags in my Bear notes library.

### 2. Search by tag

Pick any tag from the results above and find my notes tagged with [that tag].

### 3. Read a note

Pick any note from the search results above and open that note and show me its full content.

### 4. Create a note

Create a new note in Bear with content from tests/fixtures/sample-note.md

### 5. Find the created note

Search for my notes about infrastructure review.

### 6. Append text to the note

Add the new subheading "Action Items"

Add the following paragraph to that section: 'Action item: migrate Prometheus to Grafana Cloud by end of Q2. Owner: platform team.'

### 7. Tag the note

Tag that note with 'platform-engineering'.

### 8. Verify the changes

Open that note again and show me everything — I want to make sure the changes look right.

### 9. Archive the note

Archive that note, I don't need it anymore.
