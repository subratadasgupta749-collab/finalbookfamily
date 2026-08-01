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
        <p>This Cookie Policy explains how My Family History Book uses cookies and similar technologies to recognize you when you visit our website.</p>
        
        <h2>1. What are cookies?</h2>
        <p>Cookies are small data files that are placed on your computer or mobile device when you visit a website. They are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.</p>
        
        <h2>2. Why do we use cookies?</h2>
        <p>We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our website to operate ("essential" or "strictly necessary" cookies). Other cookies enable us to track and target the interests of our users to enhance the experience on our website.</p>
        
        <h2>3. Types of Cookies We Use</h2>
        <ul>
          <li><strong>Essential Cookies:</strong> These cookies are strictly necessary to provide you with services available through our website (e.g., keeping you logged in and securing your session).</li>
          <li><strong>Analytics & Performance Cookies:</strong> These cookies collect information that is used either in aggregate form to help us understand how our website is being used or how effective our marketing campaigns are. We use tools like Google Analytics for this purpose.</li>
          <li><strong>Advertising Cookies:</strong> Third parties (like Google) may use cookies to serve ads based on your prior visits to our website. Google's use of advertising cookies enables it and its partners to serve ads based on your visit to our sites and/or other sites on the Internet.</li>
        </ul>
        
        <h2>4. How can I control cookies?</h2>
        <p>You have the right to decide whether to accept or reject non-essential cookies. You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas may be restricted.</p>
        <p>To opt out of personalized advertising by Google, you can visit <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer">Google's Ads Settings</a>.</p>
        
        <h2>5. Updates to this policy</h2>
        <p>We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons.</p>
        
        <h2>6. Contact Us</h2>
        <p>If you have any questions about our use of cookies or other technologies, please contact us at support@myfamilyhistorybook.com.</p>
      </PageShell>
    </SiteLayout>
  ),
});
