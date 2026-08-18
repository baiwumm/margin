export type TocItem = {
  id: string;
  text: string;
  level: number;
};

/**
 * Extract a heading-based table of contents from the raw markdown/MDX body.
 *
 * The generated ids must match the heading ids Astro adds at render time
 * (github-slugger algorithm): lowercase, keep unicode letters/numbers/marks,
 * spaces, "-" and "_", drop other punctuation, replace every space with "-",
 * and dedupe repeated ids with a "-n" suffix.
 */
export function getTocFromMarkdown(body: string): TocItem[] {
  const items: TocItem[] = [];
  const slugCounts = new Map<string, number>();
  const lines = body.split(/\r?\n/);
  let inFence = false;

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(```|~~~)/);
    if (fenceMatch) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!headingMatch) continue;

    const level = headingMatch[1].length;
    const text = headingMatch[2]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // markdown links -> label
      .replace(/<[^>]*>/g, "") // html tags
      .replace(/\{#[\w-]+\}/g, "") // custom anchor suffix
      .trim();

    if (!text || /^table of contents$/i.test(text)) continue;

    const baseId = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
      .replace(/ /g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");

    if (!baseId) continue;

    const count = slugCounts.get(baseId) ?? 0;
    slugCounts.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count}`;

    items.push({ id, text, level });
  }

  return items;
}
