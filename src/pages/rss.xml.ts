import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getEntryPath } from "@/utils/contentEntry";
import getSortedPosts from "@/utils/getSortedPosts";
import { SITE } from "@/config";

export async function GET() {
  const [blogPosts, galleryPosts] = await Promise.all([
    getCollection("blog"),
    SITE.showGalleries && SITE.showGalleriesInIndex
      ? getCollection("galleries")
      : Promise.resolve([]),
  ]);
  const sortedPosts = getSortedPosts([...blogPosts, ...galleryPosts]);
  return rss({
    title: SITE.title,
    description: SITE.desc,
    site: SITE.website,
    stylesheet: "/rss.xsl",
    items: sortedPosts.map(entry => ({
      link: getEntryPath(entry),
      title: entry.data.title,
      description: entry.data.description,
      categories: "tags" in entry.data ? entry.data.tags : [],
      pubDate: new Date(
        "modDatetime" in entry.data && entry.data.modDatetime
          ? entry.data.modDatetime
          : entry.data.pubDatetime
      ),
    })),
  });
}
