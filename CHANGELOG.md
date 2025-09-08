# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-09-08

### Added
- **File Search**: Extended search functionality to include OCR'd text from images and PDFs ([#4](https://github.com/vasylenko/claude-desktop-extension-bear-notes/issues/4))

  Prioritize completeness over context window efficiency - better to have full information upfront than incomplete results requiring multiple API calls and confused MCP client or an end user.

    - Always search files: searchNotes() hardcoded to include OCR content from attachments - no includeFiles parameter
    - Always retrieve files: getNoteContent() hardcoded to include OCR content - no includeFiles parameter
    - Clear content separation: OCR content labeled with `# Attached Files` and `## filename` headers
    - LLM and user experience: Complete context with clear source distinction between note text and file content  

### Internal
- For Claude Code:
    - Comprehensive Bear database schema documentation
    - Enhanced development tooling with KISS/DRY code validation commands
    - Tool documentation best practices guidelines
- Small refactoring

## [1.0.0] - 2025-09-02

First release. 

Bear Notes MCP Bundle - Claude Desktop extension for comprehensive Bear Notes integration.

Features:
- 5 MCP tools: search, read, create, and append/prepend to Bear notes
- Tool annotations for client safety and UX hints
- Native Node.js SQLite for read oprations
- Bear's X-callback-URL API integration for write operations
- Debug logging with UI toggle
