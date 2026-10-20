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

export default async () => {
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
                coverKicker("cd ~"),
                {
                  type: "div",
                  props: {
                    style: {
                      fontFamily: COVER.font,
                      fontSize: 176,
                      lineHeight: 1.15,
                      color: COVER.fg,
                      marginTop: 40,
                    },
                    children: SITE.title.split("·")[0].trim(),
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontFamily: COVER.font,
                      fontSize: 36,
                      lineHeight: 1.55,
                      color: COVER.desc,
                      marginTop: 32,
                      width: "94%",
                    },
                    children: SITE.desc,
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
              children: SITE.author,
            },
          },
        ],
      },
    },
    coverSatoriOptions(await loadGoogleFonts())
  );
};
