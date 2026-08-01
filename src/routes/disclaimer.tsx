import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Disclaimer — My Family History Book" },
      { name: "description", content: "Important information about how to use My Family History Book." },
      { property: "og:title", content: "Disclaimer — My Family History Book" },
      { property: "og:description", content: "Important information about the AI-generated content, limitations, and appropriate use of the My Family History Book service." },
      { property: "og:url", content: "/disclaimer" },
    ],
    links: [{ rel: "canonical", href: "/disclaimer" }],
  }),
  component: () => (
    <SiteLayout>
      <PageShell eyebrow="Legal" title="Disclaimer" description={`Last updated: ${new Date().toLocaleDateString()}`}>
        <p>My Family History Book is provided for personal use to help you record and preserve family memories.</p>
        <h2>No professional advice</h2>
        <p>Content on this website is for informational purposes only and is not a substitute for professional advice.</p>
        <h2>User-generated content</h2>
        <p>Stories, photos, and other content added by users represent the views of those users, not of My Family History Book.</p>
        <h2>Third-party links</h2>
        <p>The service may include links to third-party sites. We are not responsible for the content or practices of those sites.</p>
        <h2>Limitation of liability</h2>
        <p>To the maximum extent permitted by law, we are not liable for any indirect or consequential loss arising from your use of the service.</p>
      </PageShell>
    </SiteLayout>
  ),
});
