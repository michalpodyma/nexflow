import type { Metadata } from "next";
import Link from "next/link";
import { posts } from "@/data/posts";

export const metadata: Metadata = {
  title: "Blog | Nexflow",
  description:
    "Aktualności, porady i wiedza o rynku pracy tymczasowej w Polsce i Niemczech — od zespołu Nexflow.",
  alternates: {
    canonical: "https://nexflow.work/blog",
    languages: {
      "x-default": "https://nexflow.work/blog",
      pl: "https://nexflow.work/blog",
      de: "https://nexflow.work/blog",
    },
  },
  openGraph: {
    title: "Blog | Nexflow",
    description:
      "Aktualności, porady i wiedza o rynku pracy tymczasowej w Polsce i Niemczech — od zespołu Nexflow.",
    url: "https://nexflow.work/blog",
    type: "website",
  },
};

const LANG_LABEL: Record<"pl" | "de", string> = {
  pl: "PL",
  de: "DE",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  const sorted = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <main className="min-h-screen bg-[hsl(var(--cloud-white))]">
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-3">
            Wiedza i aktualności
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            Blog Nexflow
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/70 max-w-xl">
            Porady dla pracowników i pracodawców — rynek pracy, formalności i
            aktualności z branży.
          </p>
        </div>
      </section>

      {/* Post list */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {sorted.length === 0 ? (
          <p className="text-muted-foreground">Brak artykułów.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block h-full bg-white rounded-xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <time
                      dateTime={post.date}
                      className="text-xs text-muted-foreground"
                    >
                      {formatDate(post.date)}
                    </time>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                      {LANG_LABEL[post.lang]}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-primary group-hover:text-accent transition-colors leading-snug mb-2">
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {post.description}
                  </p>
                  <span className="inline-block mt-4 text-sm font-medium text-accent group-hover:underline">
                    Czytaj dalej →
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
