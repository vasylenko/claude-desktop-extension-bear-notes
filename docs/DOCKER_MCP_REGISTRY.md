# Docker MCP Registry

This document describes how to submit and maintain this MCP server in the [Docker MCP Registry](https://github.com/docker/mcp-registry).

## Overview

Docker MCP Registry is a catalog of MCP servers available through Docker Desktop's MCP Toolkit. Docker builds and hosts images under the `mcp/` namespace after approval.

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for the MCP server |
| `server.yaml` | Registry metadata template |
| `tools.json` | Tool definitions for registry discovery |

## Initial Submission

1. Fork [docker/mcp-registry](https://github.com/docker/mcp-registry)

2. Create directory `servers/bear-notes/` in your fork

3. Copy and update `server.yaml`:
   ```yaml
   source:
     project: https://github.com/vasylenko/claude-desktop-extension-bear-notes
     branch: v2.1.1        # release tag
     commit: abc123...     # full commit hash
     dockerfile: Dockerfile
   ```

4. Copy `tools.json` as-is

5. Submit PR to `docker/mcp-registry`

6. After approval, image available at `mcp/bear-notes` within 24 hours

## Releasing Updates

Docker MCP Registry does not auto-update from source repositories. Each version requires a manual PR.

### Process

1. Create a GitHub release with tag (e.g., `v2.2.0`)

2. Get the commit hash:
   ```bash
   git rev-parse v2.2.0
   ```

3. Update `server.yaml` in your registry fork:
   ```yaml
   source:
     project: https://github.com/vasylenko/claude-desktop-extension-bear-notes
     branch: v2.2.0
     commit: <new-commit-hash>
     dockerfile: Dockerfile
   ```

4. Update `tools.json` if tools changed

5. Submit PR to `docker/mcp-registry`

## CI Validation

The CI workflow validates the Dockerfile builds correctly on every push and PR. Docker MCP Registry will build the actual production image after approval.

## Platform Constraints

This server only works on macOS (`darwin`) because:
- Bear Notes is macOS-only
- Requires mounting the Bear database from the host

The `compatibility.platforms` field in `server.yaml` declares this constraint.
