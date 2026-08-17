import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { posts } from "@/data/posts";

const SUPPORTED_LOCALES = ["uk", "ru", "en"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const BASE_URL = "https://nexflow.work";

const BLOG_META: Record<SupportedLocale, { title: string; description: string }> = {
  uk: {
    title: "Блог | Nexflow",
    description: "Поради для працівників і роботодавців — ринок праці, формальності та новини галузі.",
  },
  ru: {
    title: "Блог | Nexflow",
    description: "Советы для работников и работодателей — рынок труда, формальности и отраслевые новости.",
  },
  en: {
    title: "Blog | Nexflow",
    description: "Advice for workers and employers — labour market, formalities and industry news.",
  },
};

const HERO_TEXT: Record<SupportedLocale, { tag: string; heading: string; subheading: string }> = {
  uk: {
    tag: "Знання та новини",
    heading: "Блог Nexflow",
    subheading: "Поради для працівників та роботодавців — ринок праці, формальності та актуальні новини.",
  },
  ru: {
    tag: "Знания и новости",
    heading: "Блог Nexflow",
    subheading: "Советы для работников и работодателей — рынок труда, формальности и актуальные новости.",
  },
  en: {
    tag: "Knowledge & news",
    heading: "Nexflow Blog",
    subheading: "Advice for workers and employers — labour market, formalities and industry updates.",
  },
};

const READ_MORE: Record<SupportedLocale, string> = {
  uk: "Читати далі →",
  ru: "Читать далее →",
  en: "Read more →",
};

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) return {};

  const meta = BLOG_META[locale as SupportedLocale];
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `${BASE_URL}/${locale}/blog`,
    },
  };
}

function formatDate(iso: string, locale: string): string {
  const localeCode = locale === "uk" ? "uk-UA" : locale === "ru" ? "ru-RU" : "en-US";
  return new Date(iso).toLocaleDateString(localeCode, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function LocaleBlogPage({ params }: Props) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) notFound();

  const loc = locale as SupportedLocale;
  const localePosts = [...posts.filter((p) => p.lang === loc)].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const hero = HERO_TEXT[loc];
  const readMore = READ_MORE[loc];

  return (
    <main className="min-h-screen bg-[hsl(var(--cloud-white))]">
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-3">
            {hero.tag}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            {hero.heading}
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/70 max-w-xl">
            {hero.subheading}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {localePosts.length === 0 ? (
          <p className="text-muted-foreground">No articles yet.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {localePosts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/${locale}/blog/${post.slug}`}
                  className="group block h-full bg-white rounded-xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <time
                      dateTime={post.date}
                      className="text-xs text-muted-foreground"
                    >
                      {formatDate(post.date, locale)}
                    </time>
                  </div>
                  <h2 className="text-lg font-semibold text-primary group-hover:text-accent transition-colors leading-snug mb-2">
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {post.description}
                  </p>
                  <span className="inline-block mt-4 text-sm font-medium text-accent group-hover:underline">
                    {readMore}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
