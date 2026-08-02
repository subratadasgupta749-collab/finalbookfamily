import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Link } from "@tanstack/react-router";
import { Mail, Globe, List, Calendar, ShieldCheck, ChevronRight } from "lucide-react";
import type { LegalPageData } from "@/lib/legal.functions";

interface TOCItem {
  id: string;
  text: string;
}

export function LegalPageViewer({ data }: { data: LegalPageData }) {
  const [activeHeading, setActiveHeading] = useState<string>("");

  // Extract TOC items and inject IDs into headings
  const { toc, processedContent } = useMemo(() => {
    if (typeof window === "undefined" || !data.content) {
      return { toc: [], processedContent: data.content || "" };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(data.content, "text/html");
    const headings = doc.querySelectorAll("h2");
    const items: TOCItem[] = [];

    headings.forEach((h, idx) => {
      const text = h.textContent?.trim() || `Section ${idx + 1}`;
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      h.setAttribute("id", id);
      items.push({ id, text });
    });

    return { toc: items, processedContent: doc.body.innerHTML };
  }, [data.content]);

  // Construct JSON-LD Schemas
  const canonicalUrl = data.seo.canonicalUrl || `https://myfamilyhistorybook.com/${data.slug}`;

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.seo.metaTitle || data.title,
    description: data.seo.metaDescription,
    url: canonicalUrl,
    dateModified: data.lastUpdated,
    publisher: {
      "@type": "Organization",
      name: "My Family History Book",
      url: "https://myfamilyhistorybook.com",
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://myfamilyhistorybook.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: data.title,
        item: canonicalUrl,
      },
    ],
  };

  const faqSchema =
    data.seo.faqs && data.seo.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: data.seo.faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        }
      : null;

  return (
    <SiteLayout>
      {/* Inject JSON-LD Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="bg-muted/10 border-b border-border/40 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Breadcrumb Nav */}
          <nav className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{data.title}</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {data.eyebrow || "Legal & Compliance"}
          </p>
          <h1 className="mt-2 text-3xl font-serif font-bold tracking-tight sm:text-5xl">
            {data.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 bg-background px-3 py-1 rounded-full border shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Last Updated: {data.lastUpdated}
            </span>
            <span className="flex items-center gap-1.5 bg-background px-3 py-1 rounded-full border shadow-sm text-green-600 dark:text-green-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Legal Standard
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_260px]">
          {/* Main Legal Content */}
          <article className="min-w-0">
            <div
              className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-serif prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-a:text-primary prose-a:underline hover:prose-a:opacity-80"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />

            {/* Frequently Asked Questions (if present) */}
            {data.seo.faqs && data.seo.faqs.length > 0 && (
              <div className="mt-16 border-t pt-10">
                <h2 className="text-2xl font-serif font-bold tracking-tight mb-6">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {data.seo.faqs.map((faq, i) => (
                    <div
                      key={i}
                      className="rounded-lg border bg-card p-5 shadow-sm transition-all"
                    >
                      <h3 className="text-base font-semibold text-foreground">
                        {faq.question}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Official Support & Contact Footer Box */}
            <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
              <h3 className="text-lg font-serif font-bold text-foreground">
                Questions or Statutory Rights Inquiries?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                If you have questions regarding this document, statutory privacy rights under GDPR or CCPA, or platform compliance, please contact our legal and support team.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
                <a
                  href="mailto:support@myfamilyhistorybook.com"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" /> support@myfamilyhistorybook.com
                </a>
                <a
                  href="https://myfamilyhistorybook.com"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" /> https://myfamilyhistorybook.com
                </a>
              </div>
            </div>
          </article>

          {/* Sidebar TOC */}
          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-sm border-b pb-3 text-foreground">
                  <List className="h-4 w-4 text-primary" /> Table of Contents
                </div>
                <nav className="mt-3 space-y-2 text-xs">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block text-muted-foreground hover:text-primary transition-colors py-1 leading-snug truncate"
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
