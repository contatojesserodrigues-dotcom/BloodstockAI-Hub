/**
 * Normalize AI assistant output — plain, readable text without markdown noise.
 */
export function formatAgentText(raw: string): string {
  if (!raw) return "";

  let text = raw
    // Strip bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    // Convert markdown headings to spaced section titles
    .replace(/^#{1,6}\s*(.+)$/gm, (_, title: string) => `\n${title.trim()}\n`)
    // Emoji-prefixed headings (legacy prompts)
    .replace(/^##\s*([^\n]+)$/gm, (_, title: string) => `\n${title.trim()}\n`)
    // Bullet lists
    .replace(/^\s*[-*•]\s+/gm, "• ")
    // Horizontal rules
    .replace(/^-{3,}$/gm, "")
    .replace(/^\s*>\s?/gm, "");

  text = text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  return text;
}
