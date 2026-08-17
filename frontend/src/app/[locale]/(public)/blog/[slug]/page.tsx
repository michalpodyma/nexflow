import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { posts, getPostBySlug } from "@/data/posts";
import type { BlogPost } from "@/data/posts";

const SUPPORTED_LOCALES = ["uk", "ru", "en"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of SUPPORTED_LOCALES) {
    for (const post of posts.filter((p) => p.lang === locale)) {
      params.push({ locale, slug: post.slug });
    }
  }
  return params;
}

const LANG_LABEL: Record<string, string> = {
  en: "English",
  uk: "Українська",
  ru: "Русский",
};

const LANG_TO_HREFLANG: Record<string, string> = {
  en: "en",
  uk: "uk",
  ru: "ru",
};

const BASE_URL = "https://nexflow.work";

function formatDate(iso: string, locale: string): string {
  const localeCode = locale === "uk" ? "uk-UA" : locale === "ru" ? "ru-RU" : "en-US";
  return new Date(iso).toLocaleDateString(localeCode, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) return {};

  const post = getPostBySlug(slug);
  if (!post || post.lang !== locale) return {};

  const hreflang = LANG_TO_HREFLANG[locale] ?? locale;
  const canonical = `${BASE_URL}/${locale}/blog/${slug}`;

  return {
    title: `${post.title} | Nexflow`,
    description: post.description,
    alternates: {
      canonical,
      languages: {
        [hreflang]: canonical,
        "x-default": `${BASE_URL}/blog`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: canonical,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function LocaleBlogPostPage({ params }: Props) {
  const { locale, slug } = await params;

  if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) notFound();

  const post = getPostBySlug(slug);
  if (!post || post.lang !== locale) notFound();

  return (
    <main className="min-h-screen bg-[hsl(var(--cloud-white))]">
      <section className="bg-primary text-primary-foreground pb-12 pt-10">
        <div className="max-w-3xl mx-auto px-4">
          <Link
            href={`/${locale}/blog`}
            className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground mb-6 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {locale === "uk" ? "Усі статті" : locale === "ru" ? "Все статьи" : "All articles"}
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-primary-foreground/90 border border-white/20">
              {LANG_LABEL[locale] ?? locale.toUpperCase()}
            </span>
            <time
              dateTime={post.date}
              className="text-sm text-primary-foreground/60"
            >
              {formatDate(post.date, locale)}
            </time>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3">
            {post.title}
          </h1>
          <p className="text-primary-foreground/70 text-base leading-relaxed max-w-xl">
            {post.description}
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <article className="bg-white rounded-xl border border-border shadow-sm p-8">
          <div
            className="prose prose-slate max-w-none
              prose-headings:text-primary prose-headings:font-semibold
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
              prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:my-3
              prose-ul:text-muted-foreground prose-ul:my-3
              prose-li:my-1
              prose-a:text-accent prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        <section className="mt-6 bg-primary text-primary-foreground rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">
            {locale === "uk"
              ? "Шукаєте роботу за кордоном?"
              : locale === "ru"
              ? "Ищете работу за рубежом?"
              : "Looking for work abroad?"}
          </h2>
          <p className="text-primary-foreground/75 text-sm mb-6">
            {locale === "uk"
              ? "Nexflow надає повний супровід делегованих працівників — від документів до зарплати."
              : locale === "ru"
              ? "Nexflow обеспечивает полное сопровождение командированных работников — от документов до зарплаты."
              : "Nexflow provides full support for delegated workers — from documents to payroll."}
          </p>
          <Link
            href="/kontakt"
            className="inline-block bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base px-8 py-3 rounded-lg transition-colors"
          >
            {locale === "uk"
              ? "Зв'яжіться з нами →"
              : locale === "ru"
              ? "Свяжитесь с нами →"
              : "Contact us →"}
          </Link>
        </section>
      </div>
    </main>
  );
}
