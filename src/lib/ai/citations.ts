export interface Citation {
  path: string;
  startLine: number;
  endLine: number;
}

const CITATION_REGEX = /\[\[([a-zA-Z0-9_\-./]+):(\d+)(?:-(\d+))?\]\]/g;

/**
 * Parses and validates citation tokens like [[src/app/page.tsx:12-30]] or [[README.md:5]]
 */
export function parseCitations(
  text: string,
  validFileMap?: Map<string, number> // path -> totalLineCount
): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = CITATION_REGEX.exec(text)) !== null) {
    const path = match[1];
    const startLine = parseInt(match[2], 10);
    const endLine = match[3] ? parseInt(match[3], 10) : startLine;

    const key = `${path}:${startLine}-${endLine}`;
    if (!seen.has(key)) {
      seen.add(key);

      // Validate bounds if file map is provided
      if (validFileMap) {
        const totalLines = validFileMap.get(path);
        if (totalLines !== undefined && startLine <= totalLines && startLine > 0) {
          citations.push({
            path,
            startLine,
            endLine: Math.min(endLine, totalLines),
          });
        }
      } else {
        citations.push({
          path,
          startLine,
          endLine,
        });
      }
    }
  }

  return citations;
}

/**
 * Formats file lines with line numbers: " 1 | function hello() {"
 */
export function formatNumberedFile(path: string, content: string): string {
  const lines = content.split('\n');
  const pad = String(lines.length).length;
  const numbered = lines
    .map((line, idx) => `${String(idx + 1).padStart(pad, ' ')} | ${line}`)
    .join('\n');

  return `### FILE: ${path}\n\`\`\`\n${numbered}\n\`\`\``;
}
