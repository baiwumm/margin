/**
 * remark plugin: remove the legacy "## Table of contents" marker heading.
 * The TOC is now generated automatically and rendered in the article sidebar,
 * so the marker must not appear in the article body anymore.
 */
export function remarkRemoveTocMarker() {
  return (tree: {
    children?: Array<{
      type?: string;
      children?: Array<{ type?: string; value?: string }>;
    }>;
  }) => {
    const children = tree.children ?? [];
    for (let i = children.length - 1; i >= 0; i--) {
      const node = children[i];
      if (node?.type !== "heading") continue;
      const text = (node.children ?? [])
        .map(child => (child?.type === "text" ? (child.value ?? "") : ""))
        .join("")
        .trim();
      if (/^table of contents$/i.test(text)) {
        children.splice(i, 1);
      }
    }
  };
}
