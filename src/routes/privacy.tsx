import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — My Family History Book" },
      { name: "description", content: "How My Family History Book collects, uses, and protects your information." },
      { property: "og:title", content: "Privacy Policy — My Family History Book" },
      { property: "og:description", content: "Read how My Family History Book collects, uses, stores, and protects the personal information and family stories you share with us." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: () => (
    <SiteLayout>
      <PageShell eyebrow="Legal" title="Privacy Policy" description={`Last updated: ${new Date().toLocaleDateString()}`}>
        <p>This page is maintained by the My Family History Book team to explain how we handle your information.</p>
        <h2>Information we collect</h2>
        <p>We collect the information you provide directly, such as your name, email address, and the stories and photos you choose to add to your book. We also collect basic usage information (like browser type and pages visited) to keep the service running and improve it.</p>
        <h2>How we use it</h2>
        <p>We use your information to provide, secure, and improve the service, and to communicate with you about your account. We do not sell your personal information.</p>
        <h2>How we protect it</h2>
        <p>We use industry-standard security practices, including encrypted connections (HTTPS) and access controls, to protect your data. No system is perfectly secure, but we take our responsibility to you seriously.</p>
        <h2>Your choices</h2>
        <p>You can update or delete your account information at any time from your profile settings. To request full deletion of your data, contact us via the contact page.</p>
        <h2>Contact</h2>
        <p>Questions about this policy? Reach us at hello@myfamilyhistorybook.app.</p>
      </PageShell>
    </SiteLayout>
  ),
});
