/**
 * rehype plugin: make all external links in Markdown/MDX content open in a new tab.
 * Only absolute http(s) links are treated as external; internal relative links
 * (e.g. `/posts/...`) are left untouched.
 */
type HastNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export function rehypeExternalLinks() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (node.type === "element" && node.tagName === "a") {
        const href = node.properties?.href;
        if (typeof href === "string" && /^https?:\/\//i.test(href)) {
          node.properties!.target = "_blank";
          node.properties!.rel = "noopener noreferrer";
        }
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
