import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — My Family History Book" },
      { name: "description", content: "The terms that govern your use of My Family History Book." },
      { property: "og:title", content: "Terms & Conditions — My Family History Book" },
      { property: "og:description", content: "The terms and conditions that govern your account, your content, and your use of the My Family History Book service." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: () => (
    <SiteLayout>
      <PageShell eyebrow="Legal" title="Terms & Conditions" description={`Last updated: ${new Date().toLocaleDateString()}`}>
        <p>By creating an account or using My Family History Book, you agree to these terms.</p>
        <h2>Your account</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>
        <h2>Your content</h2>
        <p>You own the stories, photos, and other content you add. You grant us a limited license to store and display that content solely to provide the service to you.</p>
        <h2>Acceptable use</h2>
        <p>Do not use the service to upload unlawful content, harass others, or interfere with the security or operation of the service.</p>
        <h2>Termination</h2>
        <p>You may stop using the service at any time. We may suspend or terminate accounts that violate these terms.</p>
        <h2>Disclaimer of warranties</h2>
        <p>The service is provided "as is" without warranties of any kind, to the fullest extent permitted by law.</p>
        <h2>Contact</h2>
        <p>For questions about these terms, contact hello@myfamilyhistorybook.app.</p>
      </PageShell>
    </SiteLayout>
  ),
});
