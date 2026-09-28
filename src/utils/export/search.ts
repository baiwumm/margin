/**
 * 检索索引（D3 / D12 / D21）：bigram 滑窗切词 + pinyin-pro 拼音键。
 * 建索引与端上查询共用同一纯函数（bigramTokens 是单一事实源，M1 端上同步实现）。
 * 权重：标题 5 / 标签 4 / 摘要 3 / 小标题 2 / 正文 1。
 */
import { pinyin } from "pinyin-pro";
import type { Block, Inline, TitleIndex, TermIndex } from "./types";

/** 中文 2 字滑窗 + 拉丁/数字整词（小写、去标点）；孤立单字不进第二层（端上交给第一层） */
export function bigramTokens(text: string): string[] {
  const cleaned = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ");
  const tokens: string[] = [];
  for (const word of cleaned.split(" ")) {
    if (!word) continue;
    let buf = "";
    let bufIsCjk = false;
    const flush = () => {
      if (!buf) return;
      if (bufIsCjk) {
        for (let i = 0; i + 1 < buf.length; i++) tokens.push(buf.slice(i, i + 2));
      } else {
        tokens.push(buf);
      }
      buf = "";
    };
    for (const ch of word) {
      const isCjk = /\p{Script=Han}/u.test(ch);
      if (buf && isCjk !== bufIsCjk) flush();
      bufIsCjk = isCjk;
      buf += ch;
    }
    flush();
  }
  return tokens;
}

/** 拼音键：全拼 + 首字母，如 "weixinxiaochengxu wxlcx" */
export function pinyinKey(text: string): string {
  const full = pinyin(text, {
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
    v: true,
  })
    .join("")
    .replace(/\s+/g, "")
    .toLowerCase();
  const initials = pinyin(text, {
    pattern: "first",
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
  })
    .join("")
    .replace(/\s+/g, "")
    .toLowerCase();
  return `${full} ${initials}`.trim();
}

/** 正文块 → 纯文本（检索用；tokens join 复原，D23 口径） */
export function blocksPlainText(blocks: Block[], maxBlocks: number): string {
  const inlineText = (inlines: Inline[]) =>
    inlines.map(i => (i.t === "br" ? " " : i.v)).join("");
  const parts: string[] = [];
  for (const block of blocks.slice(0, maxBlocks)) {
    switch (block.t) {
      case "p":
      case "quote":
      case "h":
        parts.push(inlineText(block.i));
        break;
      case "list":
        for (const item of block.items) parts.push(inlineText(item));
        break;
      case "table":
        for (const row of [block.head, ...block.rows])
          for (const cell of row) parts.push(inlineText(cell));
        break;
      case "code":
        parts.push(block.tokens.map(line => line.map(t => t.v).join("")).join(" "));
        break;
      case "linkcard":
        parts.push(`${block.title} ${block.desc ?? ""}`);
        break;
      default:
        break;
    }
  }
  return parts.filter(Boolean).join(" ");
}

export const FIELD_WEIGHTS = {
  title: 5,
  tags: 4,
  description: 3,
  headings: 2,
  body: 1,
} as const;

export interface TermDocInput {
  slug: string;
  title: string;
  tags: string[];
  description: string;
  headings: string[];
  bodyText: string;
}

/** 倒排索引：term → "docId:weight,..."（docId 为 titles.docs 下标） */
export function buildTerms(docs: TermDocInput[]): TermIndex {
  const postings = new Map<string, Map<number, number>>();
  const add = (docId: number, field: keyof typeof FIELD_WEIGHTS, text: string) => {
    if (!text) return;
    const weight = FIELD_WEIGHTS[field];
    for (const term of new Set(bigramTokens(text))) {
      let doc = postings.get(term);
      if (!doc) {
        doc = new Map();
        postings.set(term, doc);
      }
      doc.set(docId, (doc.get(docId) ?? 0) + weight);
    }
  };
  docs.forEach((doc, docId) => {
    add(docId, "title", doc.title);
    add(docId, "tags", doc.tags.join(" "));
    add(docId, "description", doc.description);
    add(docId, "headings", doc.headings.join(" "));
    add(docId, "body", doc.bodyText);
  });
  const terms: Record<string, string> = {};
  for (const [term, doc] of [...postings.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    terms[term] = [...doc.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([id, w]) => `${id}:${w}`)
      .join(",");
  }
  return { buildId: "", fields: ["title", "tags", "description", "headings", "body"], terms, strategy: "bigram" };
}

export function buildTitles(
  buildId: string,
  docs: TitleIndex["docs"]
): TitleIndex {
  return { buildId, docs };
}
