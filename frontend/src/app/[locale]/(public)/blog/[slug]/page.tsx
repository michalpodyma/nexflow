import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { posts, getPostsByLang } from "@/data/posts";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string; slug: string }> };

const LOCALE_LANG_MAP: Record<string, "uk" | "ru" | "en"> = {
  uk: "uk",
  ru: "ru",
  en: "en",
};

const HREFLANG: Record<string, string> = {
  uk: "uk-UA",
  ru: "ru-RU",
  en: "en-US",
};

const LANG_LABEL: Record<string, string> = {
  uk: "Українська",
  ru: "Русский",
  en: "English",
};

const BACK_LABEL: Record<string, string> = {
  uk: "Всі статті",
  ru: "Все статьи",
  en: "All articles",
};

const CTA_HEADING: Record<string, string> = {
  uk: "Шукаєте роботу за кордоном?",
  ru: "Ищете работу за рубежом?",
  en: "Looking for work abroad?",
};

const CTA_BODY: Record<string, string> = {
  uk: "Nexflow повністю супроводжує відряджених працівників — від документів до виплати зарплати.",
  ru: "Nexflow полностью сопровождает командированных сотрудников — от документов до выплаты зарплаты.",
  en: "Nexflow handles everything for temporary workers — from documents to payroll.",
};

const CTA_BTN: Record<string, string> = {
  uk: "Зв'яжіться з нами →",
  ru: "Свяжитесь с нами →",
  en: "Contact us →",
};

export async function generateStaticParams() {
  const locales = Object.keys(LOCALE_LANG_MAP) as Array<keyof typeof LOCALE_LANG_MAP>;
  const params: Array<{ locale: string; slug: string }> = [];
  for (const locale of locales) {
    const lang = LOCALE_LANG_MAP[locale];
    const localePosts = getPostsByLang(lang);
    for (const post of localePosts) {
      params.push({ locale, slug: post.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const lang = LOCALE_LANG_MAP[locale];
  if (!lang) return {};

  const post = posts.find((p) => p.slug === slug && p.lang === lang);
  if (!post) return {};

  const hreflang = HREFLANG[locale] ?? locale;
  const canonicalUrl = `https://nexflow.work/${locale}/blog/${post.slug}`;

  return {
    title: `${post.title} | Nexflow`,
    description: post.description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        [hreflang]: canonicalUrl,
      },
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: canonicalUrl,
      type: "article",
      publishedTime: post.date,
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

export default async function LocaleBlogPostPage({ params }: Props) {
  const { locale, slug } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const lang = LOCALE_LANG_MAP[locale];
  if (!lang) notFound();

  const post = posts.find((p) => p.slug === slug && p.lang === lang);
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-[hsl(var(--cloud-white))]">
      {/* Hero */}
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
            {BACK_LABEL[locale] ?? "Blog"}
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

      {/* Article body */}
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

        {/* Footer CTA */}
        <section className="mt-6 bg-primary text-primary-foreground rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">{CTA_HEADING[locale] ?? "Looking for work?"}</h2>
          <p className="text-primary-foreground/75 text-sm mb-6">
            {CTA_BODY[locale] ?? "Nexflow handles everything for temporary workers — from documents to payroll."}
          </p>
          <Link
            href={`/${locale}/kontakt`}
            className="inline-block bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base px-8 py-3 rounded-lg transition-colors"
          >
            {CTA_BTN[locale] ?? "Contact us →"}
          </Link>
        </section>
      </div>
    </main>
  );
}
