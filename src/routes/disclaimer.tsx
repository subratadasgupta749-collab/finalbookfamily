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
        <p>The information provided by My Family History Book on our website and application is for general informational purposes only.</p>
        
        <h2>1. No Guarantee of Results</h2>
        <p>While our AI tools are designed to assist you in writing and formatting your family history, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, or completeness of the AI-generated content. You are responsible for reviewing and editing all content before printing.</p>
        
        <h2>2. External Links Disclaimer</h2>
        <p>Our website may contain links to external websites that are not provided or maintained by or in any way affiliated with us. Please note that we do not guarantee the accuracy, relevance, timeliness, or completeness of any information on these external websites.</p>
        
        <h2>3. Third-Party Tools</h2>
        <p>We use third-party tools (such as OpenAI/Anthropic/Google for AI generation, and Stripe/LemonSqueezy for payments). We are not responsible for any downtime, errors, or policies enacted by these third-party providers.</p>
        
        <h2>4. Not Legal or Professional Advice</h2>
        <p>The service and any generated books do not constitute legal, medical, or professional advice. Use of the service is solely at your own risk.</p>
        
        <h2>5. Contact Us</h2>
        <p>For any questions regarding this disclaimer, please contact us at support@myfamilyhistorybook.com.</p>
      </PageShell>
    </SiteLayout>
  ),
});
