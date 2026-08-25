/**
 * Calculates the estimated reading time for a given piece of text.
 * Strips markdown/MDX syntax before counting words for a more accurate result.
 * Supports both CJK (Chinese/Japanese/Korean) and Latin text.
 *
 * @param body - Raw markdown/MDX string content
 * @returns Formatted string like "约 3 分钟" or "不到 1 分钟"
 */
export function getReadingTime(body: string): string {
  // Strip frontmatter
  const withoutFrontmatter = body.replace(/^---[\s\S]*?---\n?/, "");

  // Strip common markdown/MDX syntax that isn't real words
  const plainText = withoutFrontmatter
    .replace(/```[\s\S]*?```/g, "") // fenced code blocks
    .replace(/`[^`]*`/g, "") // inline code
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\[.*?\]\(.*?\)/g, "$1") // links → keep link text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1") // bold/italic
    .replace(/^\s*[-*+>|]\s*/gm, "") // lists, blockquotes, tables
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();

  // Count CJK characters and Latin words separately
  const cjkCount = (plainText.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latinWordCount = (
    plainText.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) ?? []
  ).length;

  // CJK: ~400 chars/min, Latin: ~200 words/min
  const minutes = Math.ceil(cjkCount / 400 + latinWordCount / 200);

  return minutes < 1 ? "不到 1 分钟" : `约 ${minutes} 分钟`;
}

/**
 * Counts the total "words" of an article for display (e.g. "1,234 字").
 * Chinese characters are counted individually; Latin/digit runs count as one word each.
 *
 * @param body - Raw markdown/MDX string content
 * @returns Total character/word count
 */
export function getWordCount(body: string): number {
  const withoutFrontmatter = body.replace(/^---[\s\S]*?---\n?/, "");

  const plainText = withoutFrontmatter
    .replace(/```[\s\S]*?```/g, "") // fenced code blocks
    .replace(/`[^`]*`/g, "") // inline code
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\[.*?\]\(.*?\)/g, "$1") // links -> keep link text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1") // bold/italic
    .replace(/^\s*[-*+>|]\s*/gm, ""); // lists, blockquotes, tables

  const cjkCount = (plainText.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latinWords = (
    plainText.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) ?? []
  ).length;

  return cjkCount + latinWords;
}
