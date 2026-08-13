import type { Props } from "astro";
import IconMail from "@/assets/icons/IconMail.svg";
import IconGitHub from "@/assets/icons/IconGitHub.svg";
import IconBrandX from "@/assets/icons/IconBrandX.svg";
import IconLinkedin from "@/assets/icons/IconLinkedin.svg";
import IconWeibo from "@/assets/icons/IconWeibo.svg";
import {
  PUBLIC_SOCIAL_GITHUB,
  PUBLIC_SOCIAL_X,
  PUBLIC_SOCIAL_LINKEDIN,
  PUBLIC_SOCIAL_EMAIL,
} from "astro:env/client";
import { SITE } from "@/config";

interface Social {
  name: string;
  href: string;
  linkTitle: string;
  icon: (_props: Props) => Element;
  /** 覆盖默认的描边图标渲染类（实心图标需改为 fill-current） */
  iconClass?: string;
}

// ── Profile socials ────────────────────────────────────────────────────────
// URLs come from environment variables (see .env.example).
// Any entry whose URL is empty/unset is automatically excluded from the list,
// so forkers of this repo won't expose the original author's personal data.
export const SOCIALS: Social[] = (
  [
    {
      name: "GitHub",
      href: PUBLIC_SOCIAL_GITHUB ?? "",
      linkTitle: `${SITE.title} on GitHub`,
      icon: IconGitHub,
    },
    {
      name: "X",
      href: PUBLIC_SOCIAL_X ?? "",
      linkTitle: `${SITE.title} on X`,
      icon: IconBrandX,
    },
    {
      name: "LinkedIn",
      href: PUBLIC_SOCIAL_LINKEDIN ?? "",
      linkTitle: `${SITE.title} on LinkedIn`,
      icon: IconLinkedin,
    },
    {
      name: "Mail",
      href: PUBLIC_SOCIAL_EMAIL ? `mailto:${PUBLIC_SOCIAL_EMAIL}` : "",
      linkTitle: `Send an email to ${SITE.title}`,
      icon: IconMail,
    },
  ] satisfies Social[]
).filter(s => s.href !== "");

// ── Share links ────────────────────────────────────────────────────────────
// These use standard platform share URLs — no personal data involved.
// The "Mail" entry opens the visitor's own email client, not the author's.
export const SHARE_LINKS: Social[] = [
  {
    name: "X",
    href: "https://x.com/intent/post?url=",
    linkTitle: "分享到 X",
    icon: IconBrandX,
  },
  {
    name: "Weibo",
    href: "https://service.weibo.com/share/share.php?url=",
    linkTitle: "分享到微博",
    icon: IconWeibo,
    iconClass: "size-4 fill-current",
  },
  {
    name: "Mail",
    href: "mailto:?subject=See%20this%20post&body=",
    linkTitle: "通过邮件分享",
    icon: IconMail,
  },
] as const;
