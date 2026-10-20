/**
 * CustomShiki transformer that adds file name labels to code blocks.
 *
 * This transformer looks for the `file="filename"` meta attribute in code blocks
 * and creates a styled label showing the filename. It supports two different
 * styling options and can optionally hide the green dot indicator.
 *
 * @param {Object} options - Configuration options for the transformer
 * @param {string} [options.style="v2"] - The styling variant to use
 *   - `"v1"`: Tab-style with rounded top corners, positioned at top-left
 *   - `"v2"`: Mac 窗口风格——文件名收进代码块标题栏（Traffic lights 右侧），超长截断
 * @param {boolean} [options.hideDot=false] - Whether to hide the green dot indicator
 */
export const transformerFileName = ({
  style = "v2",
  hideDot = false,
} = {}) => ({
  pre(node) {
    // v1 徽章骑跨顶边，需要偏移量；v2 并入标题栏后无需偏移
    if (style === "v1") {
      node.properties.style =
        (node.properties.style || "") + `--file-name-offset: 0.75rem;`;
    }

    const raw = this.options.meta?.__raw?.split(" ");

    if (!raw) return;

    const metaMap = new Map();

    for (const item of raw) {
      const [key, value] = item.split("=");
      if (!key || !value) continue;
      metaMap.set(key, value.replace(/["'`]/g, ""));
    }

    const file = metaMap.get("file");

    if (!file) return;

    // v1 徽章悬于块外需要额外上边距；v2 标题栏在块内，无需让位
    if (style === "v1") {
      this.addClassToHast(node, "mt-8 rounded-tl-none");
    }

    // Add file name to code block
    node.children.push({
      type: "element",
      tagName: "span",
      properties: {
        class: [
          "file-name-label absolute py-0.5 text-xs font-medium leading-5 text-foreground/80",
          style === "v1"
            ? "left-0 -top-6 rounded-t-md border border-b-0 bg-muted/50 px-2"
            : `left-[76px] top-[7px] max-w-[calc(100%-180px)] truncate ${
                hideDot ? "px-2" : "pr-2"
              }`,
        ],
      },
      children: [
        {
          type: "text",
          value: file,
        },
      ],
    });
  },
});

