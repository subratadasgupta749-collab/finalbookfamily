import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPublishedPost } from "@/lib/blog.functions";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useEffect, useRef, useState } from "react";
import { Facebook, Linkedin, Link as LinkIcon, Twitter, Play, Pause, Square, Instagram, Youtube, MessageCircle, Send, Music2, Image as ImageIcon, AtSign, HelpCircle, Globe } from "lucide-react";
import { toast } from "sonner";
import { marked } from "marked";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const result = await getPublishedPost({ data: { slug: params.slug } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    const { post } = loaderData;
    const title = post.meta_title || post.title;
    const desc = post.meta_description || post.excerpt || "";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/blog/${params.slug}` },
        ...(post.featured_image_url ? [{ property: "og:image", content: post.featured_image_url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `/blog/${params.slug}` }],
    };
  },
  component: PostPage,
  errorComponent: () => <SiteLayout><div className="mx-auto max-w-2xl p-16 text-center">Something went wrong.</div></SiteLayout>,
  notFoundComponent: () => <SiteLayout><div className="mx-auto max-w-2xl p-16 text-center">Post not found.</div></SiteLayout>,
});

function PostPage() {
  const { post, alsoRead, author } = Route.useLoaderData();
  const faqArr = Array.isArray(post.faq) ? (post.faq as Array<{ q: string; a: string }>) : [];
  const renderedContent = marked.parse(post.content || "", { async: false });

  // Structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description || post.excerpt || "",
    image: post.featured_image_url ? [post.featured_image_url] : undefined,
    datePublished: post.published_at,
    author: author?.full_name ? { "@type": "Person", name: author.full_name } : undefined,
    articleSection: post.category,
    mainEntityOfPage: `/blog/${post.slug}`,
  };
  const faqLd = faqArr.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqArr.map((f) => ({
      "@type": "Question", name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <SiteLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-6">
          <Link to="/blog" className="text-sm text-primary hover:underline">← Back to blog</Link>
        </div>

        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">{post.category}</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{post.title}</h1>
        {post.excerpt && <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y py-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
              <AvatarFallback>{(author?.full_name || "A")[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="font-medium">{author?.full_name || "Editorial Team"}</div>
              {post.published_at && (
                <div className="text-xs text-muted-foreground">
                  {new Date(post.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </div>
              )}
            </div>
          </div>
          <TextToSpeechButton title={post.title} content={post.content} />
        </div>

        {post.featured_image_url && (
          <img src={post.featured_image_url} alt={post.title} className="mt-8 aspect-[16/9] w-full rounded-xl object-cover" />
        )}

        <ArticleBody html={renderedContent as string} alsoRead={alsoRead} />


        <SocialShare title={post.title} slug={post.slug} />

        {faqArr.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-4 font-serif text-2xl font-semibold">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqArr.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        <AuthorBox author={author} />

        {alsoRead.length > 0 && (
          <section className="mt-16 border-t pt-12">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary">Also Read</p>
                <h2 className="mt-1 font-serif text-3xl font-semibold">More from {post.category || "the blog"}</h2>
              </div>
              <Link to="/blog" className="hidden text-sm text-primary hover:underline sm:inline">Browse all articles →</Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {alsoRead.map((p: { id: string; title: string; slug: string; excerpt: string | null; featured_image_url: string | null; published_at: string | null; category: string | null }) => (
                <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="group">
                  <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      {p.featured_image_url ? (
                        <img src={p.featured_image_url} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary/40">
                          <ImageIcon className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      {p.category && (
                        <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-primary">{p.category}</p>
                      )}
                      <h3 className="font-serif text-lg font-semibold leading-snug line-clamp-2 group-hover:text-primary">{p.title}</h3>
                      {p.excerpt && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>
                      )}
                      {p.published_at && (
                        <p className="mt-4 text-xs text-muted-foreground">
                          {new Date(p.published_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </SiteLayout>
  );
}

type AlsoReadItem = { id: string; title: string; slug: string; excerpt: string | null; featured_image_url: string | null; published_at: string | null; category: string | null };

function ArticleBody({ html, alsoRead }: { html: string; alsoRead: AlsoReadItem[] }) {
  const proseClass = "prose prose-lg prose-neutral max-w-none prose-headings:font-serif prose-headings:font-semibold prose-headings:text-foreground prose-h2:mt-12 prose-h2:border-b prose-h2:border-border prose-h2:pb-3 prose-h3:mt-8 prose-a:text-primary prose-p:leading-8";
  const pick = alsoRead[0];

  // Split at the middle <h2> so the insertion falls on a natural section break.
  const h2Matches = Array.from(html.matchAll(/<h2\b[^>]*>/gi));
  let splitIndex = -1;
  if (h2Matches.length >= 2) {
    const mid = h2Matches[Math.floor(h2Matches.length / 2)];
    splitIndex = mid.index ?? -1;
  } else {
    // Fallback: split at the paragraph closest to the middle of the content.
    const paras = Array.from(html.matchAll(/<\/p>/gi));
    if (paras.length >= 4) {
      const midPara = paras[Math.floor(paras.length / 2)];
      splitIndex = (midPara.index ?? -1) + (midPara[0]?.length ?? 0);
    }
  }

  if (!pick || splitIndex <= 0) {
    return <div className={`mt-8 ${proseClass}`} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  const first = html.slice(0, splitIndex);
  const rest = html.slice(splitIndex);

  return (
    <>
      <div className={`mt-8 ${proseClass}`} dangerouslySetInnerHTML={{ __html: first }} />
      <InlineAlsoRead post={pick} />
      <div className={proseClass} dangerouslySetInnerHTML={{ __html: rest }} />
    </>
  );
}

function InlineAlsoRead({ post }: { post: AlsoReadItem }) {
  return (
    <aside className="my-10 not-prose">
      <Link to="/blog/$slug" params={{ slug: post.slug }} className="group block">
        <Card className="flex flex-col gap-4 overflow-hidden border-l-4 border-l-primary bg-muted/30 p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:p-5">
          {post.featured_image_url && (
            <div className="h-32 w-full shrink-0 overflow-hidden rounded-md bg-muted sm:h-24 sm:w-40">
              <img src={post.featured_image_url} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-widest text-primary">Also read</p>
            <h4 className="mt-1 font-serif text-lg font-semibold leading-snug group-hover:text-primary">
              {post.title}
            </h4>
            {post.excerpt && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
            )}
          </div>
          <span className="hidden text-sm font-medium text-primary sm:inline">Read →</span>
        </Card>
      </Link>
    </aside>
  );
}


const AUTHOR_SOCIAL_ICONS: Record<string, { Icon: typeof Facebook; label: string }> = {
  website: { Icon: Globe, label: "Website" },
  facebook: { Icon: Facebook, label: "Facebook" },
  instagram: { Icon: Instagram, label: "Instagram" },
  youtube: { Icon: Youtube, label: "YouTube" },
  pinterest: { Icon: ImageIcon, label: "Pinterest" },
  x: { Icon: Twitter, label: "X" },
  twitter: { Icon: Twitter, label: "Twitter" },
  threads: { Icon: AtSign, label: "Threads" },
  linkedin: { Icon: Linkedin, label: "LinkedIn" },
  tiktok: { Icon: Music2, label: "TikTok" },
  whatsapp: { Icon: MessageCircle, label: "WhatsApp" },
  telegram: { Icon: Send, label: "Telegram" },
  quora: { Icon: HelpCircle, label: "Quora" },
};

function AuthorBox({ author }: { author: { full_name: string | null; avatar_url: string | null; bio?: string | null; social?: Record<string, string> } | null }) {
  const links = Object.entries(AUTHOR_SOCIAL_ICONS)
    .map(([key, meta]) => ({ key, url: author?.social?.[key], ...meta }))
    .filter((l): l is { key: string; url: string; Icon: typeof Facebook; label: string } => !!l.url);
  return (
    <Card className="mt-14 flex items-start gap-4 p-5">
      <Avatar className="h-14 w-14">
        {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
        <AvatarFallback>{(author?.full_name || "A")[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="text-sm font-medium">Written by {author?.full_name || "Editorial Team"}</div>
        <p className="text-sm text-muted-foreground">
          {author?.bio || "Helping families preserve their story with My Family History Book."}
        </p>
        {links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {links.map(({ key, url, Icon, label }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={label}
                title={label}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition hover:text-foreground hover:border-foreground/40"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function SocialShare({ title, slug }: { title: string; slug: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => { setUrl(`${window.location.origin}/blog/${slug}`); }, [slug]);
  const enc = encodeURIComponent;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    catch { toast.error("Copy failed"); }
  };
  return (
    <div className="mt-10 flex flex-wrap items-center gap-2 border-t pt-6">
      <span className="mr-2 text-sm font-medium">Share:</span>
      <Button asChild size="sm" variant="outline">
        <a href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`} target="_blank" rel="noreferrer" aria-label="Share on Twitter">
          <Twitter className="h-4 w-4" />
        </a>
      </Button>
      <Button asChild size="sm" variant="outline">
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noreferrer" aria-label="Share on Facebook">
          <Facebook className="h-4 w-4" />
        </a>
      </Button>
      <Button asChild size="sm" variant="outline">
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noreferrer" aria-label="Share on LinkedIn">
          <Linkedin className="h-4 w-4" />
        </a>
      </Button>
      <Button size="sm" variant="outline" onClick={copy} aria-label="Copy link to clipboard">
        <LinkIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

function TextToSpeechButton({ title, content }: { title: string; content: string }) {
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);

  const strip = (html: string) => {
    if (typeof window === "undefined") return html;
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent || "";
  };

  const play = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Text-to-speech not supported in this browser");
      return;
    }
    if (state === "paused") { window.speechSynthesis.resume(); setState("playing"); return; }
    const utt = new SpeechSynthesisUtterance(`${title}. ${strip(content)}`);
    utt.rate = 1; utt.pitch = 1;
    utt.onend = () => setState("idle");
    utt.onerror = () => setState("idle");
    uttRef.current = utt;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
    setState("playing");
  };
  const pause = () => { window.speechSynthesis.pause(); setState("paused"); };
  const stop = () => { window.speechSynthesis.cancel(); setState("idle"); };

  return (
    <div className="flex items-center gap-1">
      <span className="mr-2 text-sm text-muted-foreground">Listen:</span>
      {state !== "playing"
        ? <Button size="sm" variant="outline" onClick={play}><Play className="h-4 w-4" /></Button>
        : <Button size="sm" variant="outline" onClick={pause}><Pause className="h-4 w-4" /></Button>}
      {state !== "idle" && (
        <Button size="sm" variant="outline" onClick={stop}><Square className="h-4 w-4" /></Button>
      )}
    </div>
  );
}
