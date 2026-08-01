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
        <p>This Privacy Policy describes how My Family History Book ("we", "us", or "our") collects, uses, and discloses your personal information when you use our website, services, and applications.</p>
        
        <h2>1. Information We Collect</h2>
        <p>We collect information that you provide directly to us, including:</p>
        <ul>
          <li><strong>Account Information:</strong> Name, email address, and authentication data (such as Google OAuth profile information).</li>
          <li><strong>User Content:</strong> Stories, photos, interviews, and family history data you upload to create your book.</li>
          <li><strong>Payment Information:</strong> When you make a purchase, your payment details (e.g., credit card information) are processed securely by our third-party payment processors (e.g., Stripe, LemonSqueezy). We do not store full credit card numbers on our servers.</li>
        </ul>
        <p>We also automatically collect certain usage information through cookies and similar technologies, such as your IP address, browser type, and interactions with our service (e.g., via Google Analytics).</p>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide, operate, and maintain our services.</li>
          <li>Process transactions and send related information, including confirmations and receipts.</li>
          <li>Authenticate users and secure accounts.</li>
          <li>Improve and personalize your experience.</li>
          <li>Analyze usage trends using tools like Google Analytics to improve our service.</li>
        </ul>

        <h2>3. Third-Party Services and Data Sharing</h2>
        <p>We do not sell your personal data. We may share information with trusted third-party service providers who assist us in operating our platform, including:</p>
        <ul>
          <li><strong>Payment Processors:</strong> To handle secure billing and transactions.</li>
          <li><strong>Analytics Providers:</strong> We use Google Analytics to understand website traffic. Google may use the collected data to contextualize and personalize the ads of its own advertising network.</li>
          <li><strong>Authentication Providers:</strong> When you log in via Google, we receive basic profile information per your consent.</li>
        </ul>

        <h2>4. Data Retention and Security</h2>
        <p>We implement industry-standard security measures, including HTTPS encryption, to protect your data. We retain your personal information and user content for as long as your account is active or as needed to provide you services, comply with legal obligations, or resolve disputes.</p>

        <h2>5. Your Rights</h2>
        <p>Depending on your location (such as under GDPR or CCPA), you may have the right to access, update, correct, or delete your personal information. You can manage your data directly in your account settings or request complete deletion by contacting us.</p>

        <h2>6. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at hello@myfamilyhistorybook.app.</p>
      </PageShell>
    </SiteLayout>
  ),
});
