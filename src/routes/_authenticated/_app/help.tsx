import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { HelpCircle, MessageCircle, Bug, Lightbulb, ChevronDown } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/help")({
  head: () => ({
    meta: [
      { title: "Help Center — My Family History Book" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HelpPage,
});

const faqs = [
  {
    q: "How do I create my first book?",
    a: "Go to Create New Book, enter the basic details of the person, then start the AI-guided interview. Your answers are saved automatically.",
  },
  {
    q: "Can I pause an interview and come back later?",
    a: "Yes. Every answer is autosaved. Your dashboard shows a Resume Interview button for the book you were last working on.",
  },
  {
    q: "How are photos used in the book?",
    a: "Photos you upload are organised into categories and placed in the matching chapters of your book preview.",
  },
  {
    q: "What file formats can I download?",
    a: "You can export a standard PDF, a DOCX you can edit, and a print-ready PDF sized for professional printing.",
  },
  {
    q: "Can I edit the AI-written text?",
    a: "Absolutely. Every chapter is editable in the manuscript editor, with autosave as you type.",
  },
];

function HelpPage() {
  const { general } = useSettings();
  const supportEmail = general?.support_email || general?.business_email;
  const [open, setOpen] = useState<number | null>(0);

  const mailto = (subject: string) =>
    supportEmail ? `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}` : "/contact";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Help Center</h1>
        <p className="mt-1 text-muted-foreground">
          Answers to common questions, and ways to reach our team.
        </p>
      </div>

      <Panel title="Frequently asked questions">
        <ul className="divide-y divide-border/60">
          {faqs.map((f, i) => (
            <li key={f.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-left"
                aria-expanded={open === i}
              >
                <span className="min-w-0 text-sm font-medium">{f.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    open === i && "rotate-180",
                  )}
                />
              </button>
              {open === i && (
                <p className="animate-fade-in pb-3 text-sm text-muted-foreground">{f.a}</p>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3">
        <SupportCard
          icon={MessageCircle}
          title="Contact Support"
          description="Get help from our team."
          href={mailto("Support request")}
        />
        <SupportCard
          icon={Bug}
          title="Report an Issue"
          description="Something not working?"
          href={mailto("Issue report")}
        />
        <SupportCard
          icon={Lightbulb}
          title="Feature Request"
          description="Tell us what to build next."
          href={mailto("Feature request")}
        />
      </div>

      <Panel title="Still stuck?">
        <div className="flex flex-wrap items-center gap-3">
          <HelpCircle className="h-5 w-5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Send us a message through the contact page and we'll get back to you.
          </p>
          <Button asChild size="sm" variant="secondary">
            <Link to="/contact">Contact page</Link>
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function SupportCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Bug;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="rounded-2xl border border-border/60 bg-background p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </a>
  );
}
