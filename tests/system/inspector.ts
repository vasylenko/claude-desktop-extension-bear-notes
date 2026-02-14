import { spawnSync } from 'child_process';
import { resolve } from 'path';

const SERVER_PATH = resolve(import.meta.dirname, '../../dist/main.js');

interface CallToolOptions {
  toolName: string;
  args?: Record<string, string>;
  env?: Record<string, string>;
}

interface ToolResponse {
  content: { type: string; text: string }[];
}

/**
 * Invokes an MCP tool via the Inspector CLI and returns the text content.
 * Each call spawns a fresh server process — no shared state between calls.
 */
export function callTool({ toolName, args, env }: CallToolOptions): string {
  const cliArgs = [
    '@modelcontextprotocol/inspector',
    '--cli',
  ];

  // Inspector's -e flag passes env vars to the spawned server process
  for (const [key, value] of Object.entries(env ?? {})) {
    cliArgs.push('-e', `${key}=${value}`);
  }

  cliArgs.push('node', SERVER_PATH, '--method', 'tools/call', '--tool-name', toolName);

  for (const [key, value] of Object.entries(args ?? {})) {
    cliArgs.push('--tool-arg', `${key}=${value}`);
  }

  const result = spawnSync('npx', cliArgs, {
    encoding: 'utf-8',
    timeout: 30_000,
  });

  if (result.error) {
    throw new Error(`Inspector CLI failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Inspector CLI exited with code ${result.status}: ${result.stderr}`);
  }

  const response: ToolResponse = JSON.parse(result.stdout);

  if (!response.content?.length) {
    throw new Error(`Inspector returned empty content for tool "${toolName}": ${result.stdout}`);
  }

  return response.content[0].text;
}

/**
 * Extracts the note body from bear-open-note response text.
 * The response has metadata (title, modified, ID) separated by `---`,
 * then the actual note content, then `---` and the attached files section.
 */
export function extractNoteBody(openNoteResponse: string): string {
  const sections = openNoteResponse.split('\n---\n');

  if (sections.length < 2) {
    throw new Error(
      `Expected metadata separator (---) in open-note response, got:\n${openNoteResponse.substring(0, 200)}`
    );
  }

  const bodyWithFooter = sections.slice(1).join('\n---\n');

  // Strip the attached files footer Bear always appends
  const attachedFilesIndex = bodyWithFooter.indexOf('\n---\n\n#Attached Files');
  if (attachedFilesIndex !== -1) {
    return bodyWithFooter.substring(0, attachedFilesIndex);
  }

  return bodyWithFooter;
}

/**
 * Extracts the first note ID from bear-search-notes response text.
 * The response format includes `ID: <uuid>` for each result.
 */
export function extractNoteId(searchResponse: string): string {
  const match = searchResponse.match(/ID:\s+([A-Fa-f0-9-]+)/);
  if (!match) {
    throw new Error(`No note ID found in search response: ${searchResponse}`);
  }
  return match[1];
}
