import type { MetadataRoute } from "next";
import { posts } from "@/data/posts";

const BASE_URL = "https://nexflow.work";
const LOCALES = ["pl", "en", "de", "nl", "ru", "uk"] as const;

type Locale = (typeof LOCALES)[number];

function buildAlternates(localePath: string): Record<string, string> {
  const languages: Record<string, string> = Object.fromEntries(
    LOCALES.map(loc => [loc, `${BASE_URL}/${loc}${localePath}`])
  );
  languages["x-default"] = `${BASE_URL}/pl${localePath}`;
  return languages;
}

function localeVariants(
  localePath: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number
): MetadataRoute.Sitemap {
  const languages = buildAlternates(localePath);
  return LOCALES.map((locale: Locale) => ({
    url: `${BASE_URL}/${locale}${localePath}`,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const localizedPages: MetadataRoute.Sitemap = [
    ...localeVariants("", "monthly", 1.0),
    ...localeVariants("/jobs", "daily", 0.9),
    ...localeVariants("/kontakt", "monthly", 0.8),
    ...localeVariants("/uslugi", "monthly", 0.7),
    ...localeVariants("/datenschutz", "yearly", 0.3),
  ];

  // Pages not yet migrated to [locale]/ — served at bare paths for now
  const barePages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/oferty`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/aplikuj`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/o-nas`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/polityka-prywatnosci`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...localizedPages, ...barePages, ...blogPages];
}
