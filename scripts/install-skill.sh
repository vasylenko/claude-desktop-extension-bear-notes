#!/bin/bash

# Bear Notes Claude Skill Installation Script
# Installs the skill to ~/.claude/skills/bear-notes/

set -e

echo "🐻 Bear Notes Claude Skill Installer"
echo "===================================="
echo ""

# Check if dist/ exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist/ directory not found"
    echo "   Please run 'npm run build' first"
    exit 1
fi

# Define installation directory
SKILL_DIR="$HOME/.claude/skills/bear-notes"

echo "📦 Installation directory: $SKILL_DIR"
echo ""

# Create skill directory
echo "Creating skill directory..."
mkdir -p "$SKILL_DIR"

# Copy skill files
echo "Copying skill files..."
cp -r skill/* "$SKILL_DIR/"

# Copy compiled code
echo "Copying compiled MCP code..."
cp -r dist "$SKILL_DIR/"

# Install dependencies
echo "Installing dependencies..."
cd "$SKILL_DIR"
npm install --silent

# Make CLI executable
chmod +x "$SKILL_DIR/scripts/bear-cli.js"

echo ""
echo "✅ Installation complete!"
echo ""
echo "📋 Installed files:"
echo "   - SKILL.md (Claude skill instructions)"
echo "   - scripts/bear-cli.js (CLI wrapper)"
echo "   - dist/ (compiled MCP code)"
echo "   - node_modules/ (dependencies)"
echo ""
echo "🧪 Test the installation:"
echo "   npm run skill:test"
echo ""
echo "🎯 Usage in Claude:"
echo "   /bear-notes search for my meeting notes"
echo "   /bear-notes create a new journal entry"
echo ""
echo "💡 Direct CLI usage:"
echo "   node ~/.claude/skills/bear-notes/scripts/bear-cli.js --help"
echo ""
echo "🔄 To update after code changes:"
echo "   npm run build && npm run skill:install"
echo ""
