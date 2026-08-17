import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostsByLang } from "@/data/posts";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

const LOCALE_LANG_MAP: Record<string, "uk" | "ru" | "en"> = {
  uk: "uk",
  ru: "ru",
  en: "en",
};

const UI: Record<string, { title: string; subtitle: string; tagline: string; hero: string; heroDesc: string; readMore: string; noArticles: string }> = {
  uk: {
    title: "Блог | Nexflow",
    subtitle: "Новини та поради",
    tagline: "Знання та актуальне",
    hero: "Блог Nexflow",
    heroDesc: "Поради для працівників і роботодавців — ринок праці, формальності та новини галузі.",
    readMore: "Читати далі →",
    noArticles: "Немає статей.",
  },
  ru: {
    title: "Блог | Nexflow",
    subtitle: "Новости и советы",
    tagline: "Знания и актуальное",
    hero: "Блог Nexflow",
    heroDesc: "Советы для работников и работодателей — рынок труда, формальности и новости отрасли.",
    readMore: "Читать далее →",
    noArticles: "Нет статей.",
  },
  en: {
    title: "Blog | Nexflow",
    subtitle: "News and tips",
    tagline: "Knowledge and updates",
    hero: "Nexflow Blog",
    heroDesc: "Tips for workers and employers — job market, paperwork and industry news.",
    readMore: "Read more →",
    noArticles: "No articles found.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const ui = UI[locale];
  if (!ui) return {};
  return {
    title: ui.title,
    alternates: {
      canonical: `https://nexflow.work/${locale}/blog`,
    },
  };
}

function formatDate(iso: string, locale: string): string {
  const intlLocale = locale === "uk" ? "uk-UA" : locale === "ru" ? "ru-RU" : "en-US";
  return new Date(iso).toLocaleDateString(intlLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function LocaleBlogPage({ params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const lang = LOCALE_LANG_MAP[locale];
  if (!lang) notFound();

  const ui = UI[locale];
  const sorted = getPostsByLang(lang).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <main className="min-h-screen bg-[hsl(var(--cloud-white))]">
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-3">
            {ui.tagline}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            {ui.hero}
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/70 max-w-xl">
            {ui.heroDesc}
          </p>
        </div>
      </section>

      {/* Post list */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {sorted.length === 0 ? (
          <p className="text-muted-foreground">{ui.noArticles}</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((post) => (
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
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                      {locale.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-primary group-hover:text-accent transition-colors leading-snug mb-2">
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {post.description}
                  </p>
                  <span className="inline-block mt-4 text-sm font-medium text-accent group-hover:underline">
                    {ui.readMore}
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
