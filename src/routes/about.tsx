import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — My Family History Book" },
      { name: "description", content: "Learn why we built My Family History Book — a calm, private way to preserve your family's story." },
      { property: "og:title", content: "About — My Family History Book" },
      { property: "og:description", content: "Learn why we built My Family History Book." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: () => (
    <SiteLayout>
      <PageShell
        eyebrow="About"
        title="A calmer home for the stories that matter."
        description="We believe every family carries stories worth keeping — and every one of them deserves a beautiful place to live."
      >
        <h2>Our mission</h2>
        <p>
          Memories fade. Photos get lost in phones. Voices we love slowly go quiet. My Family History Book exists to change that — to make it simple, private, and even joyful to gather the stories, faces, and voices that make your family <em>yours</em>.
        </p>
        <h2>What makes it different</h2>
        <p>
          We're not another social network. Your book is yours. Guided prompts help you write without pressure. Family members can add their own chapters. And when you're ready, the result is a beautifully typeset book — made to be held, shared, and passed down.
        </p>
        <h2>Built with care</h2>
        <p>
          Every design choice is made to feel calm, respectful, and lasting. Your memories deserve nothing less.
        </p>
      </PageShell>
    </SiteLayout>
  ),
});
