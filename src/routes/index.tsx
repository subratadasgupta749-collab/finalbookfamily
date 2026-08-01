import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Play,
  Star,
  ShieldCheck,
  Sparkles,
  MessageCircleQuestion,
  Camera,
  PenLine,
  BookOpen,
  Heart,
  Gift,
  Printer,
  Feather,
  Infinity as InfinityIcon,
  Check,
  Minus,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site-layout";

const hero = { url: "/images/hero.png" };
const book1 = { url: "/images/book1.png" };
const book2 = { url: "/images/book2.png" };
const book3 = { url: "/images/book3.png" };
const openbook = { url: "/images/openbook.png" };
const cta = { url: "/images/cta.png" };
const story = { url: "/images/book1.png" };
const t1 = { url: "/images/t1.png" };
const t2 = { url: "/images/t2.png" };
const t3 = { url: "/images/t3.png" };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Family History Book — Preserve Your Family's Story" },
      {
        name: "description",
        content:
          "Learn how to write a family history book the easy way. Our AI family history book creator turns interviews and photos into a personalized family history book — a printable family legacy keepsake to preserve family memories for future generations.",
      },
      {
        name: "keywords",
        content:
          "how to write a family history book, create a family history book online, personalized family history book, family story book generator, preserve family memories for future generations, AI family history book creator, family legacy book template, family memoir book creator",
      },
      { property: "og:title", content: "Create a Family History Book Online — AI Memoir Creator" },
      {
        property: "og:description",
        content:
          "AI-guided interviews turn family memories into a beautifully written, printable personalized family history book — a legacy keepsake for future generations.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { property: "og:image", content: hero.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: hero.url },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "My Family History Book — AI Family History Book Creator",
          description:
            "AI family history book creator and family story book generator that turns interviews and photos into a personalized family history book — a printable family legacy keepsake.",
          image: hero.url,
          brand: { "@type": "Brand", name: "My Family History Book" },
          offers: {
            "@type": "Offer",
            price: "34.00",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            reviewCount: "1284",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "My Family History Book",
          applicationCategory: "WebApplication",
          operatingSystem: "Any",
          offers: {
            "@type": "Offer",
            price: "34.00",
            priceCurrency: "USD",
          }
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "My Family History Book",
          url: "/",
          logo: hero.url,
          sameAs: [],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How do I write a family history book?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Our AI family history book creator asks warm, guided questions about childhood, family, career, and life lessons. Answers and photos are automatically turned into beautifully written chapters — no writing skills required.",
              },
            },
            {
              "@type": "Question",
              name: "Can I create a family history book online?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. You can create a personalized family history book online in a single afternoon. Progress is saved automatically and you can pause, resume, and edit at any time before printing.",
              },
            },
            {
              "@type": "Question",
              name: "Is this a family story book generator or a full memoir tool?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "It is both — a family story book generator for quick keepsakes and a full family memoir book creator with editable chapters, timeline, photo galleries, and print-ready PDF export.",
              },
            },
            {
              "@type": "Question",
              name: "How does the family legacy book template work?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Choose from Classic, Vintage, Modern, Leather Journal, Family Album, or Timeline Split family legacy book templates. Each template professionally typesets your story to preserve family memories for future generations.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: LandingPage,
});

/* ---------- shared bits ---------- */

function Stars({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-0.5 text-[color:var(--gold)] ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-current" strokeWidth={0} />
      ))}
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--primary)]">
      <span className="h-px w-8 bg-[color:var(--primary)]/50" />
      {children}
    </span>
  );
}

/* ---------- sections ---------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-[color:var(--gold)]/15 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-[color:var(--primary)]/10 blur-3xl" />
      </div>
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
        <div className="animate-fade-up">
          <SectionEyebrow>AI-guided family memoirs</SectionEyebrow>
          <h1 className="mt-6 text-balance font-serif text-5xl leading-[1.02] tracking-tight text-[color:var(--ink)] sm:text-6xl md:text-7xl">
            Create a <em className="not-italic text-[color:var(--primary)]">family history book</em> online — in an afternoon.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-[color:var(--muted-foreground)]">
            The easiest way to write a family history book: our AI family history book creator interviews your loved ones, weaves their answers and photos into a personalized family history book, and delivers a print-ready family legacy keepsake to preserve family memories for future generations.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="group h-13 rounded-full bg-[color:var(--primary)] px-7 text-base text-[color:var(--primary-foreground)] shadow-[var(--shadow-luxury)] hover:bg-[color:var(--primary)]/90">
              <Link to="/auth" search={{ mode: "register" }}>
                Create your family history book
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <a href="#preview" className="inline-flex h-13 items-center gap-2 rounded-full border border-[color:var(--border)] bg-white/60 px-6 text-sm font-medium text-[color:var(--ink)] backdrop-blur-sm transition hover:bg-white">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                <Play className="h-3.5 w-3.5 fill-current" />
              </span>
              Watch demo
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm text-[color:var(--muted-foreground)]">
            <div className="flex items-center gap-2">
              <Stars />
              <span>Loved by 10,000+ families</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[color:var(--primary)]" />
              Secure payment
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />
              AI powered
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-[2rem] shadow-[var(--shadow-luxury)] ring-1 ring-black/5">
            <img
              src={hero.url}
              alt="Grandparents sharing an old family photo album with their grandchildren in a warm, sunlit living room"
              width={1600}
              height={1104}
              className="h-full w-full object-cover"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          </div>

          {/* floating card */}
          <div className="animate-float-alt absolute -bottom-8 -left-6 hidden max-w-[16rem] rounded-2xl border border-[color:var(--border)] bg-white/90 p-4 shadow-[var(--shadow-soft)] backdrop-blur-md sm:block">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                <Feather className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[color:var(--muted-foreground)]">Chapter drafted</p>
                <p className="font-serif text-sm font-medium text-[color:var(--ink)]">"The summer of 1968"</p>
              </div>
            </div>
          </div>

          <div className="animate-float absolute -right-4 top-8 hidden rounded-2xl border border-[color:var(--border)] bg-white/90 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-md sm:block">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <img src={t1.url} alt="" className="h-7 w-7 rounded-full border-2 border-white object-cover" />
                <img src={t2.url} alt="" className="h-7 w-7 rounded-full border-2 border-white object-cover" />
                <img src={t3.url} alt="" className="h-7 w-7 rounded-full border-2 border-white object-cover" />
              </div>
              <p className="text-xs text-[color:var(--ink)]">
                <span className="font-semibold">1,284 memoirs</span> written this month
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Books() {
  const books = [
    { img: book1.url, title: "Classic Heirloom", tag: "Leather-bound" },
    { img: book2.url, title: "Vintage Memoir", tag: "Cloth & gold foil" },
    { img: book3.url, title: "Leather Journal", tag: "Brass corners" },
  ];
  return (
    <section id="books" className="relative border-y border-[color:var(--border)]/60 bg-[color:var(--cream)]">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>The book</SectionEyebrow>
          <h2 className="mt-5 font-serif text-4xl tracking-tight text-[color:var(--ink)] sm:text-5xl">
            A keepsake worthy of their story.
          </h2>
          <p className="mt-4 text-[color:var(--muted-foreground)]">
            Choose from timeless hardcover designs — printed on archival paper, made to last generations.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b, i) => (
            <div
              key={b.title}
              className="group relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-gradient-to-b from-white to-[color:var(--beige)] p-8 shadow-[var(--shadow-soft)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[var(--shadow-luxury)]"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mx-auto flex h-72 items-end justify-center">
                <img
                  src={b.img}
                  alt={b.title}
                  loading="lazy"
                  width={912}
                  height={1104}
                  className="h-full w-auto rounded-md object-contain drop-shadow-[0_20px_30px_rgba(80,45,20,0.35)] transition-transform duration-700 group-hover:-translate-y-2 group-hover:rotate-1"
                />
              </div>
              <div className="mt-8 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gold)]">{b.tag}</p>
                <h3 className="mt-2 font-serif text-2xl text-[color:var(--ink)]">{b.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: MessageCircleQuestion, title: "Answer simple AI questions", body: "Warm, thoughtful prompts guide you or your loved one through the memories that matter — no writing skills needed." },
    { icon: Camera, title: "Upload family photos", body: "Add vintage snapshots, letters, and heirlooms. We enhance and place them beautifully throughout the book." },
    { icon: PenLine, title: "AI writes your story", body: "Our AI transforms answers into elegant, professionally-written chapters — in the voice of your family." },
    { icon: BookOpen, title: "Download & print", body: "Preview your book, then download a beautifully typeset PDF ready for print — or order a hardcover." },
  ];
  return (
    <section id="how" className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>How it works</SectionEyebrow>
          <h2 className="mt-5 font-serif text-4xl tracking-tight text-[color:var(--ink)] sm:text-5xl">
            Four gentle steps to a finished memoir.
          </h2>
          <p className="mt-4 text-[color:var(--muted-foreground)]">
            Most families finish their first draft in an afternoon.
          </p>
        </div>

        <div className="relative mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="group relative rounded-3xl border border-[color:var(--border)] bg-white p-8 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-luxury)]">
              <div className="absolute -top-5 left-8 grid h-10 w-10 place-items-center rounded-full bg-[color:var(--primary)] font-serif text-sm font-semibold text-[color:var(--primary-foreground)] shadow-md">
                {i + 1}
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-6 font-serif text-xl text-[color:var(--ink)]">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-foreground)]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyLove() {
  const items = [
    { icon: Heart, title: "Preserve memories", body: "Capture stories, voices, and turning points before they fade." },
    { icon: Feather, title: "Professional writing", body: "Elegant prose crafted from your family's own words." },
    { icon: Sparkles, title: "Easy AI interview", body: "Gentle prompts — no blank page, ever." },
    { icon: Printer, title: "Ready to print", body: "Beautifully typeset PDF, print-shop ready." },
    { icon: InfinityIcon, title: "Lifetime keepsake", body: "Archival paper, timeless design, generations of use." },
    { icon: Gift, title: "Perfect gift", body: "The most meaningful gift you'll ever give a parent." },
  ];
  return (
    <section className="relative bg-gradient-to-b from-[color:var(--beige)] via-[color:var(--cream)] to-[color:var(--beige)] py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-end gap-8 md:grid-cols-[1fr_auto] md:gap-16">
          <div>
            <SectionEyebrow>Why families love it</SectionEyebrow>
            <h2 className="mt-5 max-w-2xl font-serif text-4xl tracking-tight text-[color:var(--ink)] sm:text-5xl">
              A heartfelt heirloom — without the overwhelm.
            </h2>
          </div>
          <p className="max-w-sm text-[color:var(--muted-foreground)]">
            Everything designed to make preserving a life story feel like a warm afternoon, not a project.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="group rounded-3xl border border-[color:var(--border)]/70 bg-white/70 p-7 backdrop-blur-sm transition-all hover:-translate-y-1 hover:bg-white hover:shadow-[var(--shadow-soft)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--gold)]/25 to-[color:var(--primary)]/15 text-[color:var(--primary)]">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-serif text-xl text-[color:var(--ink)]">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-foreground)]">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BeforeAfter() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <SectionEyebrow>Before &amp; after</SectionEyebrow>
        <h2 className="mt-5 font-serif text-4xl tracking-tight text-[color:var(--ink)] sm:text-5xl">
          From simple answers to timeless prose.
        </h2>
        <p className="mt-4 text-[color:var(--muted-foreground)]">
          Watch a raw interview transform into a beautifully written chapter.
        </p>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="relative rounded-3xl border border-dashed border-[color:var(--border)] bg-[color:var(--cream)] p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-3 py-1 text-xs uppercase tracking-widest text-[color:var(--muted-foreground)]">
            Raw answer
          </span>
          <p className="mt-6 font-mono text-sm leading-relaxed text-[color:var(--muted-foreground)]">
            "Yeah so we met in '68… I was working at the diner on Elm Street. He came in almost every day. Ordered black coffee. Never said much. Then one Tuesday he asked if I liked movies. That was it, I guess."
          </p>
        </div>

        <div className="relative rounded-3xl bg-gradient-to-br from-[color:var(--primary)] to-[#5A3A22] p-[1px] shadow-[var(--shadow-luxury)]">
          <div className="rounded-[calc(1.5rem-1px)] bg-white p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)]/15 px-3 py-1 text-xs uppercase tracking-widest text-[color:var(--primary)]">
              Written chapter
            </span>
            <p className="mt-6 font-serif text-xl leading-relaxed text-[color:var(--ink)]">
              "It was the summer of 1968, and Elm Street shimmered under a heat that made the diner windows sweat. He came in every morning, ordered black coffee, and rarely spoke — until one quiet Tuesday, he looked up and asked me if I liked the movies. It was such a small question. It changed everything."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Preview() {
  return (
    <section id="preview" className="relative overflow-hidden bg-[color:var(--cream)] py-24">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(212,175,55,0.15), transparent 50%), radial-gradient(circle at 80% 70%, rgba(139,94,60,0.12), transparent 55%)" }} />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>See inside</SectionEyebrow>
          <h2 className="mt-5 font-serif text-4xl tracking-tight text-[color:var(--ink)] sm:text-5xl">
            Every page, made to be treasured.
          </h2>
          <p className="mt-4 text-[color:var(--muted-foreground)]">
            Timelines, chapters, quotes, and photographs — laid out with the care of a fine art book.
          </p>
        </div>

        <div className="mt-16 overflow-hidden rounded-[2rem] shadow-[var(--shadow-luxury)] ring-1 ring-black/5">
          <img
            src={openbook.url}
            alt="Open family memoir book showing chapter, timeline, and vintage photographs"
            loading="lazy"
            width={1600}
            height={1104}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-4">
          {[
            { k: "Chapters", v: "12 – 24" },
            { k: "Photographs", v: "up to 200" },
            { k: "Pages", v: "80 – 240" },
            { k: "Paper", v: "Archival matte" },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-5 text-center backdrop-blur">
              <p className="text-xs uppercase tracking-widest text-[color:var(--muted-foreground)]">{s.k}</p>
              <p className="mt-1 font-serif text-2xl text-[color:var(--ink)]">{s.v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { img: t1.url, name: "Margaret H.", role: "Daughter, Oregon", quote: "My mother cried when she held it. She said, 'This is my whole life, and it's beautiful.' I'll never forget that moment." },
    { img: t2.url, name: "David R.", role: "Son, Boston", quote: "Dad has always been quiet about his past. The AI prompts drew out stories I'd never heard in 40 years." },
    { img: t3.url, name: "Ana G.", role: "Granddaughter, Madrid", quote: "The book arrived a week before Abuela's 80th. It's now the centerpiece of every family gathering." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <SectionEyebrow>Loved by families</SectionEyebrow>
        <h2 className="mt-5 font-serif text-4xl tracking-tight text-[color:var(--ink)] sm:text-5xl">
          Stories that stay with us.
        </h2>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {items.map((t) => (
          <figure key={t.name} className="flex flex-col rounded-3xl border border-[color:var(--border)] bg-white p-8 shadow-[var(--shadow-soft)]">
            <Stars />
            <blockquote className="mt-5 flex-1 font-serif text-lg leading-relaxed text-[color:var(--ink)]">
              "{t.quote}"
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-[color:var(--border)] pt-5">
              <img src={t.img} alt={t.name} loading="lazy" width={600} height={600} className="h-11 w-11 rounded-full object-cover" />
              <div>
                <p className="text-sm font-semibold text-[color:var(--ink)]">{t.name}</p>
                <p className="text-xs text-[color:var(--muted-foreground)]">{t.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const includes = [
    "Unlimited AI-guided interviews",
    "Up to 200 photos, beautifully placed",
    "Professionally written chapters",
    "Elegant, print-ready PDF",
    "Preview before you pay",
    "Free lifetime updates to your book",
  ];
  return (
    <section id="pricing" className="relative overflow-hidden bg-gradient-to-b from-[color:var(--beige)] to-[color:var(--cream)] py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>Simple pricing</SectionEyebrow>
          <h2 className="mt-5 font-serif text-4xl tracking-tight text-[color:var(--ink)] sm:text-5xl">
            One book. One price. Forever yours.
          </h2>
          <p className="mt-4 text-[color:var(--muted-foreground)]">
            No subscriptions, no hidden fees. Preview the entire book before you pay a cent.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-white shadow-[var(--shadow-luxury)] md:grid-cols-[1.2fr_1fr]">
          <div className="border-b border-[color:var(--border)] bg-gradient-to-br from-[color:var(--cream)] to-[color:var(--beige)] p-10 md:border-b-0 md:border-r">
            <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)]/15 px-3 py-1 text-xs uppercase tracking-widest text-[color:var(--primary)]">
              One-time payment
            </span>
            <h3 className="mt-5 font-serif text-3xl text-[color:var(--ink)]">The Family History Book</h3>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-serif text-6xl font-semibold text-[color:var(--ink)]">$34</span>
              <span className="text-[color:var(--muted-foreground)]">USD</span>
            </div>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">One-time. No subscription. Ever.</p>
            <Button asChild size="lg" className="mt-8 h-13 w-full rounded-full bg-[color:var(--primary)] text-base text-[color:var(--primary-foreground)] shadow-[var(--shadow-soft)] hover:bg-[color:var(--primary)]/90">
              <Link to="/checkout">
                Buy now — $34
              </Link>
            </Button>
            <p className="mt-3 text-center text-xs text-[color:var(--muted-foreground)]">
              Secure checkout · 30-day happiness guarantee
            </p>
          </div>

          <div className="p-10">
            <p className="text-xs uppercase tracking-widest text-[color:var(--muted-foreground)]">What's included</p>
            <ul className="mt-4 space-y-3">
              {includes.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-[color:var(--ink)]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                    <Check className="h-3 w-3" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    { q: "How do I write a family history book with no writing experience?", a: "Our AI family history book creator asks warm, guided questions about childhood, family, career, and life lessons — then turns the answers into professionally written chapters. If you can hold a conversation, you can write a family history book." },
    { q: "Can I really create a family history book online in one sitting?", a: "Yes. Most families finish a first draft of their personalized family history book in a single afternoon. Progress saves automatically, so you can pause, resume, and edit whenever you like." },
    { q: "Is this a family story book generator or a full memoir tool?", a: "Both. Use it as a quick family story book generator for a keepsake, or as a full family memoir book creator with editable chapters, timelines, photo galleries, and a print-ready PDF." },
    { q: "What family legacy book templates do I get?", a: "Choose from Classic, Vintage, Modern, Leather Journal, Family Album, and Timeline Split family legacy book templates — every one professionally typeset and print-shop ready." },
    { q: "How does this help preserve family memories for future generations?", a: "Interviews, photos, and voices are captured, structured into chapters, and exported as an archival, print-ready book — a lasting family legacy your grandchildren can hold." },
    { q: "Can I preview the book before paying?", a: "Yes. You'll see your full personalized family history book — chapters, photos, and layout — before you're asked to pay a single cent." },
    { q: "What do I get for $34?", a: "A beautifully typeset, print-ready PDF of your complete family history book, with unlimited edits and free updates for life." },
    { q: "Is my family's data private?", a: "Your stories are yours. We never sell your data, everything is encrypted, and you can delete your account and content at any time." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-4xl px-5 py-24 sm:px-8">
      <div className="text-center">
        <SectionEyebrow>Questions</SectionEyebrow>
        <h2 className="mt-5 font-serif text-4xl tracking-tight text-[color:var(--ink)] sm:text-5xl">
          Everything you might be wondering.
        </h2>
      </div>

      <div className="mt-12 divide-y divide-[color:var(--border)] rounded-3xl border border-[color:var(--border)] bg-white">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <div key={it.q}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-6 px-7 py-6 text-left transition hover:bg-[color:var(--cream)]/70"
                aria-expanded={isOpen}
              >
                <span className="font-serif text-lg text-[color:var(--ink)]">{it.q}</span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--border)] text-[color:var(--primary)]">
                  {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </span>
              </button>
              {isOpen && (
                <div className="animate-fade-up px-7 pb-7 text-[color:var(--muted-foreground)]">
                  {it.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] shadow-[var(--shadow-luxury)] ring-1 ring-black/5">
          <img
            src={cta.url}
            alt="A multigenerational family laughing together around a dinner table at golden hour"
            loading="lazy"
            width={1600}
            height={1008}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-2xl p-10 text-white sm:p-16 md:p-20">
              <SectionEyebrow>
                <span className="text-[color:var(--gold)]">The time is now</span>
              </SectionEyebrow>
              <h2 className="mt-5 font-serif text-4xl leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
                Don't let their story fade away.
              </h2>
              <p className="mt-5 max-w-lg text-lg text-white/85">
                Begin today. The book you create will be treasured long after we're gone.
              </p>
              <Button asChild size="lg" className="mt-8 h-13 rounded-full bg-[color:var(--gold)] px-7 text-base text-[color:var(--accent-foreground)] shadow-[var(--shadow-luxury)] hover:bg-[color:var(--gold)]/90">
                <Link to="/auth" search={{ mode: "register" }}>
                  Start creating your family history book
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* small story image side rail on wider screens for visual richness */}
      <img src={story.url} alt="" aria-hidden loading="lazy" className="hidden" />
    </section>
  );
}


function LandingPage() {
  return (
    <SiteLayout>
        <Hero />
        <Books />
        <HowItWorks />
        <WhyLove />
        <BeforeAfter />
        <Preview />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCTA />
    </SiteLayout>
  );
}
