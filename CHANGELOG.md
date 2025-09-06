# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **File Search**: Extended search functionality to include OCR'd text from images and PDFs ([#4](https://github.com/vasylenko/claude-desktop-extension-bear-notes/issues/4))
  - Added optional `includeFiles` parameter to `bear-search-notes` and `bear-open-note` tools
  - Search now finds content in attached files when enabled (default: false for performance)
  - Leverages Bear's existing OCR functionality for comprehensive content discovery
  - Backward compatible - existing integrations continue working unchanged

### Internal
- Comprehensive Bear database schema documentation
- Enhanced development tooling with KISS/DRY code validation commands
- Tool documentation best practices guidelines

## [1.0.0] - 2025-09-02

First release. 

Bear Notes MCP Bundle - Claude Desktop extension for comprehensive Bear Notes integration.

Features:
- 5 MCP tools: search, read, create, and append/prepend to Bear notes
- Tool annotations for client safety and UX hints
- Native Node.js SQLite for read oprations
- Bear's X-callback-URL API integration for write operations
- Debug logging with UI toggle
