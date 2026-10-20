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

/**
 * Generates an OG image for a tag page.
 * @param {string} tagName - The display name of the tag (e.g. "javascript")
 */
export default async tagName => {
  const hostname = new URL(SITE.website).hostname;

  return satori(
    {
      type: "div",
      props: {
        style: coverRoot(),
        children: [
          coverTopBar(hostname, new Date().getFullYear()),
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                marginTop: 80,
              },
              children: [
                coverKicker(tagName),
                {
                  type: "div",
                  props: {
                    style: {
                      fontFamily: COVER.font,
                      fontSize: 152,
                      lineHeight: 1.18,
                      color: COVER.fg,
                      marginTop: 40,
                      overflow: "hidden",
                    },
                    children: `#${tagName}`,
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
              children: `${SITE.title} · ${SITE.author}`,
            },
          },
        ],
      },
    },
    coverSatoriOptions(await loadGoogleFonts())
  );
};
