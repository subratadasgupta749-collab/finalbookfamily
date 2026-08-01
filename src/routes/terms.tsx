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
        <p>By accessing or using My Family History Book, you agree to be bound by these Terms & Conditions.</p>
        
        <h2>1. Account Responsibilities</h2>
        <p>You must provide accurate information when creating an account. You are solely responsible for safeguarding your password and for all activities that occur under your account.</p>
        
        <h2>2. Purchases, Subscriptions, and Refunds</h2>
        <p><strong>Payments:</strong> All purchases (whether one-time or subscription-based) are processed securely through our authorized payment gateways. By providing payment information, you authorize us and our payment processors to charge the designated amounts.</p>
        <p><strong>Refund Policy:</strong> We offer a 30-day money-back guarantee for digital services if you are unsatisfied, provided the final print-ready PDF has not been exported or physical books have not been sent to printing. Physical book purchases are custom-printed and are generally non-refundable unless damaged or defective upon arrival.</p>
        
        <h2>3. User Content and License</h2>
        <p>You retain full ownership of all stories, photos, and information you upload ("User Content"). By uploading, you grant us a non-exclusive, worldwide, royalty-free license to host, process, and display your User Content strictly for the purpose of providing the service to you.</p>
        
        <h2>4. Acceptable Use Policy</h2>
        <p>You agree not to use the service to upload illegal, offensive, or copyright-infringing material. We reserve the right to remove content or terminate accounts that violate these terms or abuse our platform.</p>
        
        <h2>5. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, My Family History Book shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the service. The service is provided on an "AS IS" and "AS AVAILABLE" basis.</p>
        
        <h2>6. Changes to Terms</h2>
        <p>We may modify these terms at any time. Continued use of the service constitutes acceptance of the modified terms.</p>
        
        <h2>7. Contact</h2>
        <p>For billing inquiries, refund requests, or questions about these terms, contact us at hello@myfamilyhistorybook.app.</p>
      </PageShell>
    </SiteLayout>
  ),
});
