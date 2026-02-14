/**
 * Applies note creation conventions by embedding tags as Bear inline syntax
 * at the start of the text body, rather than passing them as URL parameters
 * (which places them at the bottom of the note).
 */
export function applyNoteConventions(
  input: { text: string | undefined; tags: string | undefined },
): { text: string | undefined; tags: undefined } {
  if (!input.tags?.trim()) {
    return { text: input.text, tags: undefined };
  }

  const tagLine = input.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map(toBearTagSyntax)
    .filter(Boolean)
    .join(' ');

  // All tags were invalid (e.g., "###,,,") — pass text through unchanged
  if (!tagLine) {
    return { text: input.text, tags: undefined };
  }

  const text = input.text?.trim()
    ? `${tagLine}\n---\n${input.text}`
    : tagLine;

  return { text, tags: undefined };
}

/**
 * Bear uses `#tag` for simple tags and `#tag#` (closing hash) for tags
 * containing spaces or slashes — this is Bear's multi-word tag delimiter.
 */
function toBearTagSyntax(raw: string): string {
  const cleaned = raw.replace(/^#+|#+$/g, '').trim();
  if (!cleaned) return '';

  const needsClosingHash = cleaned.includes('/') || cleaned.includes(' ');
  return needsClosingHash ? `#${cleaned}#` : `#${cleaned}`;
}
