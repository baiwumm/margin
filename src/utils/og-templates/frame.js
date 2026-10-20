// OG 封面统一风格：黑底终端风（与手作封面 00-cover-og.png 同一设计语言）。
// 设计基准 1200×630，全部按 2 倍尺寸渲染（2400×1260）以保证平台压缩后的清晰度。
// 字体为站内同款 Maple Mono CN（本地子集，加载见 src/utils/loadGoogleFont.ts）。

export const COVER = {
  bg: "#0b0b0b",
  fg: "#f2f2f2",
  desc: "#a8a8a8",
  muted: "#8c8c8c",
  faint: "#7d7d7d",
  hairline: "#3a3a3a",
  accent: "#ff6a2b",
  font: "Maple Mono CN",
  width: 2400, // 1200 × 2
  height: 1260, // 630 × 2
};

export function coverRoot() {
  return {
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    backgroundColor: COVER.bg,
    color: COVER.fg,
    padding: "90px",
  };
}

export function coverTopBar(left, right) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontFamily: COVER.font,
        fontSize: 26,
        letterSpacing: 5,
        color: COVER.faint,
        paddingBottom: 22,
        borderBottom: `1px solid ${COVER.hairline}`,
      },
      children: [
        { type: "span", props: { style: {}, children: left } },
        { type: "span", props: { style: {}, children: right } },
      ],
    },
  };
}

export function coverKicker(text) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: COVER.font,
        fontSize: 58,
        color: COVER.accent,
      },
      children: [
        { type: "span", props: { style: {}, children: `$ ${text}` } },
        {
          type: "div",
          props: {
            style: { width: 30, height: 56, backgroundColor: COVER.accent },
          },
        },
      ],
    },
  };
}

export function coverSatoriOptions(fonts) {
  return {
    width: COVER.width,
    height: COVER.height,
    embedFont: true,
    fonts,
  };
}
