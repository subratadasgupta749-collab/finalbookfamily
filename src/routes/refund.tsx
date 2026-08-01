import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — My Family History Book" },
      { name: "description", content: "Refund and cancellation policy for My Family History Book." },
    ],
    links: [{ rel: "canonical", href: "/refund" }],
  }),
  component: () => (
    <SiteLayout>
      <PageShell eyebrow="Legal" title="Refund Policy" description={`Last updated: ${new Date().toLocaleDateString()}`}>
        <p>At My Family History Book, we want you to be completely satisfied with your purchase. This Refund Policy outlines the terms under which we offer refunds for our digital products and services.</p>
        
        <h2>1. 30-Day Happiness Guarantee</h2>
        <p>We stand behind the quality of our service. If you are not satisfied with your family history book within 30 days of your purchase, you may request a full refund, provided that:</p>
        <ul>
          <li>You have not downloaded the final, print-ready PDF export of your completed book.</li>
          <li>You have not already ordered a physical printed copy of the book (if applicable).</li>
        </ul>
        
        <h2>2. Digital Goods and Services</h2>
        <p>Because our product is a digital service that requires significant computational resources (such as AI generation and image processing), we cannot offer refunds once the final digital product has been completely generated, exported, or delivered, except where required by law.</p>
        
        <h2>3. How to Request a Refund</h2>
        <p>To request a refund under our 30-day guarantee, please contact our support team at <strong>support@myfamilyhistorybook.com</strong> with your order details and the email address associated with your account. We aim to process all eligible refund requests within 5-7 business days.</p>
        
        <h2>4. Non-Refundable Items</h2>
        <p>The following are generally non-refundable:</p>
        <ul>
          <li>Accounts that have violated our Terms of Service.</li>
          <li>Purchases made more than 30 days ago.</li>
          <li>Orders where the final PDF book has already been exported or printed.</li>
        </ul>
        
        <h2>5. Chargebacks and Disputes</h2>
        <p>If you encounter an issue with billing, please contact us first at <strong>support@myfamilyhistorybook.com</strong>. We are committed to resolving payment issues amicably. Filing an unwarranted chargeback may result in the suspension or termination of your account.</p>

        <h2>6. Changes to this Policy</h2>
        <p>We reserve the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting to this page. Your continued use of the service signifies your acceptance of any such changes.</p>
      </PageShell>
    </SiteLayout>
  ),
});
