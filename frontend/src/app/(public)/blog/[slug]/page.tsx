import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { posts, getPostBySlug } from "@/data/posts";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return posts
    .filter((post) => post.lang === "pl" || post.lang === "de")
    .map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const HREFLANG: Record<string, string> = { pl: "pl-PL", de: "de-DE", uk: "uk-UA", ru: "ru-RU", en: "en-US" };
  const hreflangLocale = HREFLANG[post.lang] ?? post.lang;

  return {
    title: `${post.title} | Nexflow`,
    description: post.description,
    alternates: {
      canonical: `https://nexflow.work/blog/${post.slug}`,
      languages: {
        [hreflangLocale]: `https://nexflow.work/blog/${post.slug}`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://nexflow.work/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
    },
  };
}

const LANG_LABEL: Record<string, string> = {
  pl: "Polski",
  de: "Deutsch",
  uk: "Українська",
  ru: "Русский",
  en: "English",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-[hsl(var(--cloud-white))]">
      {/* Hero */}
      <section className="bg-primary text-primary-foreground pb-12 pt-10">
        <div className="max-w-3xl mx-auto px-4">
          <Link
            href="/blog"
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
            Wszystkie artykuły
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-primary-foreground/90 border border-white/20">
              {LANG_LABEL[post.lang]}
            </span>
            <time
              dateTime={post.date}
              className="text-sm text-primary-foreground/60"
            >
              {formatDate(post.date)}
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
          <h2 className="text-xl font-bold mb-2">Szukasz pracy za granicą?</h2>
          <p className="text-primary-foreground/75 text-sm mb-6">
            Nexflow kompleksowo obsługuje pracowników delegowanych — od
            dokumentów po wypłatę.
          </p>
          <Link
            href="/kontakt"
            className="inline-block bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base px-8 py-3 rounded-lg transition-colors"
          >
            Skontaktuj się z nami →
          </Link>
        </section>
      </div>
    </main>
  );
}
