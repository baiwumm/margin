import satori from "satori";
import { SITE } from "@/config";
import loadGoogleFonts from "../loadGoogleFont";
import {
  COVER,
  coverRoot,
  coverTopBar,
  coverKicker,
  coverSatoriOptions,
} from "./frame";

function clampLines(lines) {
  return {
    overflow: "hidden",
    display: "-webkit-box",
    lineClamp: lines,
    boxOrient: "vertical",
  };
}

export default async post => {
  const hostname = new URL(SITE.website).hostname;
  const published = new Date(post.data.pubDatetime);
  const dateLabel = `${published.getFullYear()}.${String(published.getMonth() + 1).padStart(2, "0")}`;
  const tags = post.data.tags ?? [];

  return satori(
    {
      type: "div",
      props: {
        style: coverRoot(),
        children: [
          coverTopBar(hostname, dateLabel),
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                marginTop: 64,
              },
              children: [
                coverKicker(tags[0] ?? "posts"),
                {
                  type: "div",
                  props: {
                    style: {
                      fontFamily: COVER.font,
                      fontSize: 112,
                      lineHeight: 1.22,
                      color: COVER.fg,
                      marginTop: 36,
                      ...clampLines(3),
                    },
                    children: post.data.title,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontFamily: COVER.font,
                      fontSize: 33,
                      lineHeight: 1.55,
                      color: COVER.desc,
                      marginTop: 30,
                      width: "94%",
                      ...clampLines(2),
                    },
                    children: post.data.description,
                  },
                },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontFamily: COVER.font,
                fontSize: 26,
                letterSpacing: 4,
                color: COVER.muted,
              },
              children: tags.length ? tags.join(" · ") : hostname,
            },
          },
        ],
      },
    },
    coverSatoriOptions(await loadGoogleFonts())
  );
};
