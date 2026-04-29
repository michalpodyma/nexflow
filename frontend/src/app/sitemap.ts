import type { MetadataRoute } from "next";
import { posts } from "@/data/posts";

const BASE_URL = "https://nexflow.work";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "monthly", priority: 1.0 },
    { url: `${BASE_URL}/oferty`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/kontakt`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/aplikuj`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/uslugi`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/o-nas`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/polityka-prywatnosci`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages];
}
