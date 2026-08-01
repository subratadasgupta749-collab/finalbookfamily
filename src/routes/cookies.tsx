import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — My Family History Book" },
      { name: "description", content: "How My Family History Book uses cookies and similar technologies." },
      { property: "og:title", content: "Cookie Policy — My Family History Book" },
      { property: "og:description", content: "How My Family History Book uses essential, preference, and analytics cookies, and how you can control them from your browser." },
      { property: "og:url", content: "/cookies" },
    ],
    links: [{ rel: "canonical", href: "/cookies" }],
  }),
  component: () => (
    <SiteLayout>
      <PageShell eyebrow="Legal" title="Cookie Policy" description={`Last updated: ${new Date().toLocaleDateString()}`}>
        <p>We use cookies and similar technologies to keep you signed in, remember your preferences, and understand how the service is used.</p>
        <h2>Types of cookies</h2>
        <p><strong>Essential:</strong> Required for authentication and core features. The service will not work without them.</p>
        <p><strong>Preferences:</strong> Remember your choices, such as theme or language.</p>
        <p><strong>Analytics:</strong> Help us understand how the service is used so we can improve it.</p>
        <h2>Managing cookies</h2>
        <p>You can control cookies through your browser settings. Blocking essential cookies will affect your ability to sign in and use the service.</p>
        <h2>Contact</h2>
        <p>Questions? Reach us at hello@myfamilyhistorybook.app.</p>
      </PageShell>
    </SiteLayout>
  ),
});
