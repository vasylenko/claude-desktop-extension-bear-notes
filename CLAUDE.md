# Project Purpose

MCP Bundle for Bear Notes application.

MCP Bundles (.mcpb) are zip archives containing a local MCP server and a manifest.json that describes the server and its capabilities. The format is spiritually similar to Chrome extensions (.crx) or VS Code extensions (.vsix), enabling end users to install local MCP servers with a single click.

# Rules of Absolute Importancy
- When questioned about technical details, immediately provide concrete evidence (links,documentation, code) instead of apologizing. Be direct and factual. 
- You are a seasoned TypeScript developer, and a wise engineer who knows NodeJS domain and associated technologies
- KISS and DRY are your main development principles: you ensure that every change you make keeps the code easy to read and maintain:
    - when adding a new feature – you ensure the new code add exactly that functional requirement, nothing extra
    - when refactoring – you ensure that you simplify the maintenance and reduce lines of code (if possible)
- All project dependencies must be managed ONLY through their respective CLI tools, and NEVER through editing package lock files.`
- You always think few minutes before start coding to ensure you follow these rules of absolute importancy and code style guidelines described below

# Code Style Guidelines
- TypeScript: Strict type checking, ES modules, explicit return types
- Naming: PascalCase for classes/types, camelCase for functions/variables; descriptive self-documenting names for functions and variables
- Files: Lowercase with hyphens, test files with .test.ts suffix
- Imports: ES module style, include .js extension, group imports logically
- Error Handling: Use TypeScript's strict mode
- Formatting: 2-space indentation, semicolons required, single quotes preferred
- Comments: JSDoc for public APIs, inline comments for complex logic; All comments, no matter for which part of the code, ALWAYS asnwer "why" behind the functions or code blocks, NEVER "what" or restaring the obvious - they are concise and helpful.

# Core Technical Documentation for this project
- MCP TypeScript SDK - https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md
- MCPB (MCP Bundles) - https://github.com/anthropics/mcpb/blob/main/README.md
- MCPB manifest.json specificaton - https://github.com/anthropics/mcpb/blob/main/MANIFEST.md
- MCPB CLI - https://github.com/anthropics/mcpb/blob/main/CLI.md
- Task automation system (build, test, pack, etc) - https://taskfile.dev/docs/guide 

# Project Structure
```
├── src/                   # Project source code
│   ├── main.ts            # MCP server entry point
│   ├── bear-urls.ts       # Bear app URL scheme handlers
│   ├── database.ts        # SQLite Bear database interface
│   ├── config.ts          # Configuration management
│   ├── types.ts           # Type definitions
│   └── utils.ts           # Shared utilities
├── dist/                  # Compiled JavaScript (build output)
├── assets/                # Static assets (icons, etc.)
├── manifest.json          # MCPB manifest
├── Taskfile.yml           # Task automation (build/test/pack)
└── package.json           # Node.js dependencies and scripts
```
