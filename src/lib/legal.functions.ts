import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface SEOData {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  faqs?: FAQItem[];
}

export interface LegalPageRevision {
  timestamp: string;
  updatedBy: string;
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

export interface LegalPageData {
  slug: string;
  title: string;
  eyebrow: string;
  lastUpdated: string;
  published: boolean;
  content: string;
  seo: SEOData;
  revisions?: LegalPageRevision[];
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/* ============================================================================
 * DEFAULT LEGAL DOCUMENTS (DRAFTED BY SENIOR TECH LAW & COMPLIANCE ADVISOR)
 * ============================================================================ */

export const DEFAULT_LEGAL_PAGES: Record<string, LegalPageData> = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    eyebrow: "Data Protection & Privacy",
    lastUpdated: "2026-08-02",
    published: true,
    seo: {
      metaTitle: "Privacy Policy — My Family History Book | GDPR & CCPA Compliant",
      metaDescription: "Learn how My Family History Book collects, encrypts, uses, and safeguards your personal information, family interview transcripts, and uploaded photos.",
      canonicalUrl: "https://myfamilyhistorybook.com/privacy",
      ogTitle: "Privacy Policy — My Family History Book",
      ogDescription: "Comprehensive overview of user data privacy, AI interview data processing, encryption, GDPR/CCPA rights, and third-party security integrations.",
      twitterTitle: "Privacy Policy — My Family History Book",
      twitterDescription: "Our commitment to protecting your family stories, memories, and photos.",
      faqs: [
        {
          question: "Does My Family History Book sell my personal family stories or photos?",
          answer: "No. We never sell, rent, monetize, or trade your personal data, uploaded photographs, AI interview transcripts, or generated books to third parties."
        },
        {
          question: "How is my AI interview data used by language models?",
          answer: "Your family stories and interview responses are processed strictly to generate your custom book and biography. We do not use your private content to train public AI models."
        },
        {
          question: "What are my rights under GDPR and CCPA?",
          answer: "You have full rights to access, export (PDF/DOCX), rectify, restrict, or permanently delete your account and all associated family data at any time."
        }
      ]
    },
    content: `
      <h2>1. Executive Summary & Scope</h2>
      <p>This Privacy Policy ("Policy") governs the collection, processing, storage, and protection of personal data by <strong>My Family History Book</strong> ("Company", "we", "us", or "our"), operating the digital platform located at <a href="https://myfamilyhistorybook.com">https://myfamilyhistorybook.com</a> (the "Platform"). This Policy applies to all registered users, site visitors, and individuals participating in our AI-guided interview and book generation services.</p>

      <h2>2. Information We Collect</h2>
      <p>We collect information directly from you, automatically through your interactions, and from authorized third-party authentication providers:</p>
      <ul>
        <li><strong>Account & Profile Information:</strong> Full name, email address, profile avatar, account preferences, and authentication credentials managed via Firebase Authentication and Google Authentication (OAuth 2.0).</li>
        <li><strong>User-Generated Content & Media:</strong> Uploaded family photographs, audio/text responses during AI-powered family history interviews, biographical details, memory prompts, notes, and custom book layouts.</li>
        <li><strong>AI Output & Derivative Works:</strong> AI-generated biographies, structured chapters, edited transcripts, and finalized PDF/DOCX export formats.</li>
        <li><strong>Payment & Transactional Data:</strong> Order records, subscription details, referral codes, and transaction identifiers. Full financial details (credit card numbers, bank accounts) are handled directly by payment providers (LemonSqueezy, Wise, Payoneer) and are never stored on our servers.</li>
        <li><strong>Technical & Analytical Information:</strong> Internet Protocol (IP) address, browser specifications, operating system details, device type, referrer URLs, and interactive analytics collected via Google Analytics, Google Search Console, and security verifications via Google reCAPTCHA.</li>
      </ul>

      <h2>3. How We Process Your Data & AI Integrations</h2>
      <p>We process personal data solely for legitimate business purposes and contract performance:</p>
      <ul>
        <li><strong>AI Book & Biography Generation:</strong> Your interview responses and family text are transmitted securely to advanced AI providers (including Google Gemini AI, and future providers such as OpenAI, OpenRouter, and DeepSeek) via encrypted API calls to generate rich chapter text and biographies.</li>
        <li><strong>Platform Functionality & Security:</strong> Authenticating access, preventing fraud via reCAPTCHA, managing your user dashboard, processing cloud photo storage, and rendering PDF/DOCX book exports.</li>
        <li><strong>Communication & Support:</strong> Responding to contact form inquiries, sending system updates, delivery notifications, and managing opted-in newsletter subscriptions.</li>
        <li><strong>Referrals & Rewards:</strong> Tracking referral link attribution and issuing rewards via Wise or Payoneer.</li>
      </ul>

      <h2>4. Data Storage, Encryption & Retention</h2>
      <p>Your data is encrypted in transit using Transport Layer Security (TLS 1.3) and encrypted at rest using AES-256 standards within our secure Supabase and Vercel Cloud infrastructure. We retain personal data for as long as your account remains active or as required by applicable tax, billing, and reporting laws.</p>

      <h2>5. Third-Party Integrations & Service Providers</h2>
      <p>We share data with trusted third-party sub-processors solely to perform essential services on our behalf:</p>
      <ul>
        <li><strong>Authentication:</strong> Firebase Authentication, Google OAuth 2.0.</li>
        <li><strong>AI Infrastructure:</strong> Google Gemini AI API, OpenAI API, OpenRouter API, DeepSeek API.</li>
        <li><strong>Payments & Financials:</strong> LemonSqueezy, Wise, Payoneer.</li>
        <li><strong>Analytics & Security:</strong> Google Analytics, Google Search Console, Google reCAPTCHA.</li>
      </ul>

      <h2>6. International Data Transfers</h2>
      <p>Information collected may be transferred to, stored, and processed in servers located in the United States and other global regions. Where international transfers occur, we implement standard contractual clauses (SCCs) and robust technical safeguards to ensure equivalent protection under GDPR and international privacy frameworks.</p>

      <h2>7. Your Statutory Rights (GDPR & CCPA Compliance)</h2>
      <p>Under applicable privacy laws, including the European Union General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA), you possess the following rights:</p>
      <ul>
        <li><strong>Right of Access & Portability:</strong> Obtain a complete copy of your personal data and export your family books in standard formats (PDF/DOCX).</li>
        <li><strong>Right to Rectification & Erasure:</strong> Correct inaccuracies or request permanent deletion ("Right to be Forgotten") of your account and uploaded photos.</li>
        <li><strong>Right to Restrict & Object:</strong> Opt-out of analytics cookies or newsletter communications at any time.</li>
      </ul>

      <h2>8. Children's Privacy Notice</h2>
      <p>Our Service is intended for adult users, parents, and family members. We do not knowingly collect personal information directly from children under the age of 16 without explicit parental consent.</p>

      <h2>9. Contact Our Data Protection Officer</h2>
      <p>For privacy inquiries, statutory rights requests, or data deletion applications, please contact our privacy office at <a href="mailto:support@myfamilyhistorybook.com">support@myfamilyhistorybook.com</a> or visit <a href="https://myfamilyhistorybook.com">https://myfamilyhistorybook.com</a>.</p>
    `
  },
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    eyebrow: "User Agreement & Governance",
    lastUpdated: "2026-08-02",
    published: true,
    seo: {
      metaTitle: "Terms & Conditions — My Family History Book",
      metaDescription: "Read the binding legal agreement governing user accounts, AI book generation, copyright ownership, subscription billing, and acceptable platform use.",
      canonicalUrl: "https://myfamilyhistorybook.com/terms",
      ogTitle: "Terms & Conditions — My Family History Book",
      ogDescription: "Comprehensive legal agreement establishing account rules, AI tool usage, intellectual property ownership, and liability limitations.",
      twitterTitle: "Terms & Conditions — My Family History Book",
      twitterDescription: "Governance guidelines for using My Family History Book platform services.",
      faqs: [
        {
          question: "Who owns the copyright to my generated family history book?",
          answer: "You retain 100% ownership of your original family stories, uploaded photographs, and final generated book content."
        },
        {
          question: "Can I export and print my family book elsewhere?",
          answer: "Yes, you can export your completed book in digital PDF and editable DOCX formats to print or share at your convenience."
        }
      ]
    },
    content: `
      <h2>1. Acceptance of Terms & Agreement</h2>
      <p>Welcome to <strong>My Family History Book</strong>. By accessing or creating an account on <a href="https://myfamilyhistorybook.com">https://myfamilyhistorybook.com</a> (the "Platform"), you enter into a legally binding contract with My Family History Book ("Company", "we", "us"). If you do not agree to these Terms & Conditions ("Terms"), you may not access or use the Platform.</p>

      <h2>2. Eligibility & Account Responsibilities</h2>
      <p>You must be at least 18 years old (or the legal age of majority in your jurisdiction) to establish an account. Accounts may be created using Email credentials or Google OAuth authentication. You are solely responsible for keeping your login credentials confidential and for all activities conducted under your account.</p>

      <h2>3. Platform Services & AI Generation</h2>
      <p>My Family History Book provides an interactive platform combining AI-powered interviews, text synthesis, photo management, and layout generation to help users compose custom family memoirs, biographies, and keepsake books. AI capabilities are supported by state-of-the-art providers (including Google Gemini AI, OpenAI, OpenRouter, and DeepSeek).</p>

      <h2>4. Intellectual Property & License Grants</h2>
      <ul>
        <li><strong>User Ownership:</strong> You retain full copyright ownership of all personal stories, memory inputs, transcripts, family photographs, and custom content you upload or input.</li>
        <li><strong>License to Company:</strong> You grant us a non-exclusive, worldwide, royalty-free, revocable license strictly to host, process, format, transmit, and render your content for the sole purpose of producing your digital books and providing Platform features.</li>
        <li><strong>Platform IP:</strong> All proprietary platform code, user interfaces, branding, graphics, book templates, software logic, and editorial tools belong exclusively to the Company.</li>
      </ul>

      <h2>5. Subscriptions, Payments & Referral System</h2>
      <p>Purchases for digital book exports, physical print packages, and premium memberships are processed via certified third-party merchant partners (LemonSqueezy, Wise, Payoneer). All fees are quoted in USD unless specified otherwise. Referral program participants must comply with ethical promotional guidelines; fraudulent referrals or self-referrals will result in immediate disqualification and account termination.</p>

      <h2>6. Acceptable Use & Prohibited Activities</h2>
      <p>You agree not to use the Platform to upload, generate, or transmit any content that is illegal, defamatory, fraudulent, infringing on third-party copyrights, or containing malicious code. We reserve the right to suspend or terminate accounts that breach these standards.</p>

      <h2>7. Disclaimer of Warranties & Limitation of Liability</h2>
      <p>THE PLATFORM AND ALL AI SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, THE COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.</p>

      <h2>8. Governing Law & Dispute Resolution</h2>
      <p>These Terms shall be governed by and construed in accordance with the laws of the operating jurisdiction, without giving effect to any principles of conflicts of law. Any legal claims must be submitted to binding arbitration or competent courts within the governing jurisdiction.</p>

      <h2>9. Questions & Contact Information</h2>
      <p>For questions regarding these Terms, contact our legal counsel team at <a href="mailto:support@myfamilyhistorybook.com">support@myfamilyhistorybook.com</a>.</p>
    `
  },
  refund: {
    slug: "refund",
    title: "Refund Policy",
    eyebrow: "Customer Care & Guarantees",
    lastUpdated: "2026-08-02",
    published: true,
    seo: {
      metaTitle: "Refund Policy — My Family History Book | 30-Day Money-Back Guarantee",
      metaDescription: "Learn about our 30-day refund policy, eligibility criteria for digital book exports, physical book print orders, and chargeback prevention procedures.",
      canonicalUrl: "https://myfamilyhistorybook.com/refund",
      ogTitle: "Refund Policy — My Family History Book",
      ogDescription: "Clear terms for digital purchase refunds, physical book replacement guarantees, and customer satisfaction commitments.",
      twitterTitle: "Refund Policy — My Family History Book",
      twitterDescription: "Our policy on digital product refunds and print order satisfaction guarantees.",
      faqs: [
        {
          question: "Can I request a refund for a digital book package?",
          answer: "Yes, we offer a 30-day money-back guarantee for digital services if you are unsatisfied, provided the final print-ready PDF has not been exported or sent to production."
        },
        {
          question: "What happens if my physical hardcover book arrives damaged?",
          answer: "If your printed book arrives damaged or with manufacturing defects, contact us within 14 days of delivery with photos, and we will send a replacement free of charge."
        }
      ]
    },
    content: `
      <h2>1. Overview & Commitment to Quality</h2>
      <p>At <strong>My Family History Book</strong>, we strive to deliver an extraordinary experience as you preserve your family's legacy. This Refund Policy outlines the conditions under which refunds, store credits, or replacements are granted for digital platform access, AI features, and custom printed keepsake books.</p>

      <h2>2. Digital Services & 30-Day Money-Back Guarantee</h2>
      <p>We offer a <strong>30-day money-back guarantee</strong> for digital package purchases under the following terms:</p>
      <ul>
        <li>You may request a full refund within 30 calendar days of your initial purchase if you are dissatisfied with our software features or AI interview tool.</li>
        <li><strong>Exception:</strong> Once a high-resolution, print-ready PDF or editable DOCX export has been generated and downloaded, the digital service is deemed fully delivered and non-refundable.</li>
      </ul>

      <h2>3. Physical Print Orders</h2>
      <p>Physical keepsake books are custom manufactured on-demand. Because every book is uniquely personalized:</p>
      <ul>
        <li>Orders sent to production cannot be canceled or refunded.</li>
        <li><strong>Defects & Shipping Damage:</strong> If your physical book arrives with manufacturing flaws, binding defects, or shipping damage, notify us at <a href="mailto:support@myfamilyhistorybook.com">support@myfamilyhistorybook.com</a> within 14 days of receipt with photograph evidence. We will issue a free reprint and replacement immediately.</li>
      </ul>

      <h2>4. Refund Request Procedure</h2>
      <p>To submit a refund or replacement request:</p>
      <ol>
        <li>Email your order details and purchase email to <a href="mailto:support@myfamilyhistorybook.com">support@myfamilyhistorybook.com</a>.</li>
        <li>State the specific reason for your request.</li>
        <li>Our support desk will evaluate your request within 2 business days. Approved refunds will be credited back to your original payment method via LemonSqueezy, Wise, or Payoneer within 5-10 business days.</li>
      </ol>

      <h2>5. Chargebacks & Fraud Prevention</h2>
      <p>We encourage customers to contact our support team directly to resolve issues before initiating a credit card chargeback. Unjustified chargebacks or fraudulent claims may result in account termination and legal recovery efforts.</p>
    `
  },
  cookies: {
    slug: "cookies",
    title: "Cookie Policy",
    eyebrow: "Tracking & Preference Governance",
    lastUpdated: "2026-08-02",
    published: true,
    seo: {
      metaTitle: "Cookie Policy — My Family History Book",
      metaDescription: "Understand how My Family History Book uses cookies, local storage, analytics trackers, and authentication session tokens.",
      canonicalUrl: "https://myfamilyhistorybook.com/cookies",
      ogTitle: "Cookie Policy — My Family History Book",
      ogDescription: "Detailed technical breakdown of essential, analytical, functional, and security cookies utilized across our platform.",
      twitterTitle: "Cookie Policy — My Family History Book",
      twitterDescription: "Information about cookie categories and browser management tools.",
      faqs: [
        {
          question: "Can I disable non-essential cookies on My Family History Book?",
          answer: "Yes, you can manage your preferences through your browser settings or opt-out of analytical tracking at any time."
        }
      ]
    },
    content: `
      <h2>1. What Are Cookies & Web Storage Technologies</h2>
      <p>Cookies are small text files stored on your browser or device when you visit <a href="https://myfamilyhistorybook.com">https://myfamilyhistorybook.com</a>. They enable us to recognize your session, secure your login, remember preferences, and analyze how visitors interact with our Platform.</p>

      <h2>2. Categories of Cookies We Use</h2>
      <ul>
        <li><strong>Strictly Necessary / Essential Cookies:</strong> Required for fundamental security, user authentication (Firebase/Google Auth), CSRF protection, and session maintenance. The Platform cannot function without these.</li>
        <li><strong>Functional & Security Cookies:</strong> Remember your user interface preferences, active draft state, and verify user integrity via Google reCAPTCHA.</li>
        <li><strong>Performance & Analytics Cookies:</strong> Placed by Google Analytics to gather aggregated, anonymized metrics on page traffic, feature usage, and navigational performance.</li>
      </ul>

      <h2>3. Third-Party Cookies & Tracking Tools</h2>
      <p>We integrate third-party tools that may set cookie identifiers:</p>
      <ul>
        <li><strong>Google Analytics & Search Console:</strong> Measure performance and search visibility.</li>
        <li><strong>Google reCAPTCHA:</strong> Protect sign-up and contact forms from automated spam bots.</li>
        <li><strong>LemonSqueezy Payment Merchant:</strong> Maintain checkout state during order transactions.</li>
      </ul>

      <h2>4. Managing Cookie Preferences</h2>
      <p>You can adjust your browser settings to decline or clear cookies. Note that disabling essential cookies will restrict your ability to log in or edit your family history books. For assistance, contact <a href="mailto:support@myfamilyhistorybook.com">support@myfamilyhistorybook.com</a>.</p>
    `
  },
  disclaimer: {
    slug: "disclaimer",
    title: "Disclaimer",
    eyebrow: "Legal Disclaimers & Notices",
    lastUpdated: "2026-08-02",
    published: true,
    seo: {
      metaTitle: "Disclaimer — My Family History Book | AI & Content Terms",
      metaDescription: "Read our disclaimers regarding AI content generation, historical accuracy, family story authenticity, and non-professional advice.",
      canonicalUrl: "https://myfamilyhistorybook.com/disclaimer",
      ogTitle: "Disclaimer — My Family History Book",
      ogDescription: "Important legal disclaimers regarding AI text generation, user historical content, and external integrations.",
      twitterTitle: "Disclaimer — My Family History Book",
      twitterDescription: "Legal limitations regarding AI output and family story editing responsibility.",
      faqs: [
        {
          question: "Are AI-generated biographies guaranteed to be 100% historically accurate?",
          answer: "AI models synthesize text based on user inputs. Users must review and proofread all generated text to verify historical accuracy before printing."
        }
      ]
    },
    content: `
      <h2>1. General Platform Disclaimer</h2>
      <p>The information, tools, and generative outputs provided by <strong>My Family History Book</strong> on <a href="https://myfamilyhistorybook.com">https://myfamilyhistorybook.com</a> are provided for personal memory preservation, creative storytelling, and family keepsake purposes only.</p>

      <h2>2. AI Content & Generative Limitations</h2>
      <p>Our platform incorporates advanced Artificial Intelligence models (such as Google Gemini AI, OpenAI, OpenRouter, and DeepSeek) to convert interview responses into structured chapters and biographies. AI models may occasionally generate unintended inaccuracies, stylistic variations, or factual discrepancies ("hallucinations"). Users are strongly advised to thoroughly review, proofread, and verify all text prior to exporting or ordering printed books.</p>

      <h2>3. Historical & Ancestral Accuracy</h2>
      <p>We do not verify the objective historical truth, lineage claims, or factual correctness of user-submitted memories, family anecdotes, or uploaded photographs. You retain full editorial responsibility for your final published manuscript.</p>

      <h2>4. No Professional Advice</h2>
      <p>Content published or generated through the Platform does not constitute legal, financial, tax, genealogical certification, or medical advice. Use of the service is at your own risk.</p>

      <h2>5. External Links</h2>
      <p>Our site may contain links to third-party services or payment processors. We assume no responsibility for the content, privacy policies, or practices of external websites.</p>

      <h2>6. Contact Us</h2>
      <p>For inquiries regarding this Disclaimer, reach us at <a href="mailto:support@myfamilyhistorybook.com">support@myfamilyhistorybook.com</a>.</p>
    `
  },
  dmca: {
    slug: "dmca",
    title: "DMCA Policy",
    eyebrow: "Copyright Enforcement & Takedown",
    lastUpdated: "2026-08-02",
    published: true,
    seo: {
      metaTitle: "DMCA Copyright Policy — My Family History Book",
      metaDescription: "Digital Millennium Copyright Act (DMCA) notice procedure, copyright infringement reporting, counter-notifications, and contact details.",
      canonicalUrl: "https://myfamilyhistorybook.com/dmca",
      ogTitle: "DMCA Policy — My Family History Book",
      ogDescription: "Official DMCA compliance guidelines for reporting copyright violations or submitting counter-notices.",
      twitterTitle: "DMCA Policy — My Family History Book",
      twitterDescription: "Copyright infringement reporting process under the Digital Millennium Copyright Act.",
      faqs: [
        {
          question: "How do I report copyright infringement on My Family History Book?",
          answer: "Send a formal DMCA takedown notice with the 6 required statutory elements to our designated agent at dmca@myfamilyhistorybook.com."
        }
      ]
    },
    content: `
      <h2>1. Copyright Compliance Statement</h2>
      <p><strong>My Family History Book</strong> respects the intellectual property rights of creators and expects all users to do the same. In compliance with the Digital Millennium Copyright Act of 1998 ("DMCA"), 17 U.S.C. § 512, we will respond expeditiously to legitimate claims of copyright infringement committed on our Platform (<a href="https://myfamilyhistorybook.com">https://myfamilyhistorybook.com</a>).</p>

      <h2>2. Submitting a DMCA Infringement Notice</h2>
      <p>If you are a copyright owner or authorized representative and believe that material residing on our Platform infringes your copyright, please submit a written notification containing all six (6) statutory elements listed below to our Designated Agent:</p>
      <ol>
        <li>A physical or electronic signature of the copyright owner or authorized agent.</li>
        <li>Clear identification of the copyrighted work claimed to have been infringed.</li>
        <li>Identification of the specific material claimed to be infringing, including direct URLs or location details.</li>
        <li>Your complete contact information (full name, mailing address, telephone number, and email address).</li>
        <li>A statement that you have a good-faith belief that use of the material is not authorized by the copyright owner, its agent, or the law.</li>
        <li>A statement, made under penalty of perjury, that the information in the notification is accurate and that you are authorized to act on behalf of the owner.</li>
      </ol>

      <h2>3. Counter-Notification Procedure</h2>
      <p>If your content was removed or disabled as a result of a DMCA notice and you believe this occurred due to mistake or misidentification, you may submit a written counter-notification containing your signature, contact details, identification of the removed material, and a statement under penalty of perjury agreeing to local court jurisdiction.</p>

      <h2>4. Repeat Infringer Policy</h2>
      <p>We maintain a strict policy to terminate the accounts of users who repeatedly infringe third-party intellectual property rights.</p>

      <h2>5. Designated Copyright Agent Contact</h2>
      <p>Send all DMCA notices and counter-notifications to:</p>
      <p><strong>Designated DMCA Agent</strong><br />
      Email: <a href="mailto:support@myfamilyhistorybook.com">support@myfamilyhistorybook.com</a> (or <a href="mailto:dmca@myfamilyhistorybook.com">dmca@myfamilyhistorybook.com</a>)<br />
      Web: <a href="https://myfamilyhistorybook.com">https://myfamilyhistorybook.com</a></p>
    `
  }
};

/* ============================================================================
 * SERVER FUNCTIONS FOR LEGAL PAGES MANAGEMENT
 * ============================================================================ */

export const getLegalPage = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const settingKey = `legal_page_${data.slug}`;
    const { data: row, error } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle();

    if (error) {
      console.error("Error fetching legal page setting:", error.message);
    }

    if (row && row.value && typeof row.value === "object") {
      const val = row.value as unknown as LegalPageData;
      if (val.content && val.title) return val;
    }

    const defaultPage = DEFAULT_LEGAL_PAGES[data.slug];
    if (defaultPage) return defaultPage;

    return {
      slug: data.slug,
      title: data.slug.toUpperCase(),
      eyebrow: "Legal",
      lastUpdated: new Date().toISOString().split("T")[0],
      published: true,
      content: "<p>Legal document content is under preparation.</p>",
      seo: {
        metaTitle: `${data.slug.toUpperCase()} — My Family History Book`,
        metaDescription: "Legal information for My Family History Book.",
        canonicalUrl: `https://myfamilyhistorybook.com/${data.slug}`,
      },
    };
  });

const saveLegalSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  eyebrow: z.string().default("Legal"),
  published: z.boolean().default(true),
  content: z.string().default(""),
  seo: z.object({
    metaTitle: z.string().default(""),
    metaDescription: z.string().default(""),
    canonicalUrl: z.string().optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    ogImage: z.string().optional(),
    twitterTitle: z.string().optional(),
    twitterDescription: z.string().optional(),
    faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  }),
});

export const saveLegalPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveLegalSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const settingKey = `legal_page_${data.slug}`;

    const { data: existingRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle();

    const existingVal = (existingRow?.value ?? {}) as Partial<LegalPageData>;
    const previousRevisions: LegalPageRevision[] = Array.isArray(existingVal.revisions)
      ? existingVal.revisions
      : [];

    const newRevision: LegalPageRevision = {
      timestamp: new Date().toISOString(),
      updatedBy: context.userId,
      title: data.title,
      content: data.content,
      metaTitle: data.seo.metaTitle,
      metaDescription: data.seo.metaDescription,
    };

    const updatedRevisions = [newRevision, ...previousRevisions].slice(0, 15);

    const payload: LegalPageData = {
      slug: data.slug,
      title: data.title,
      eyebrow: data.eyebrow,
      lastUpdated: new Date().toISOString().split("T")[0],
      published: data.published,
      content: data.content,
      seo: data.seo,
      revisions: updatedRevisions,
    };

    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        { key: settingKey, value: payload as any, updated_by: context.userId },
        { onConflict: "key" },
      );

    if (error) throw new Error(error.message);
    return { ok: true, data: payload };
  });

export const getLegalPageRevisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const settingKey = `legal_page_${data.slug}`;
    const { data: row } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle();

    const val = (row?.value ?? {}) as Partial<LegalPageData>;
    return Array.isArray(val.revisions) ? val.revisions : [];
  });

export const restoreLegalPageRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; timestamp: string }) =>
    z.object({ slug: z.string().min(1), timestamp: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const settingKey = `legal_page_${data.slug}`;

    const { data: row } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle();

    const val = (row?.value ?? {}) as Partial<LegalPageData>;
    const revisions: LegalPageRevision[] = Array.isArray(val.revisions) ? val.revisions : [];
    const targetRev = revisions.find((r) => r.timestamp === data.timestamp);

    if (!targetRev) throw new Error("Revision not found");

    const updatedPayload: LegalPageData = {
      slug: data.slug,
      title: targetRev.title || val.title || data.slug,
      eyebrow: val.eyebrow || "Legal",
      lastUpdated: new Date().toISOString().split("T")[0],
      published: val.published ?? true,
      content: targetRev.content,
      seo: {
        ...(val.seo ?? { metaTitle: targetRev.metaTitle, metaDescription: targetRev.metaDescription }),
        metaTitle: targetRev.metaTitle || val.seo?.metaTitle || "",
        metaDescription: targetRev.metaDescription || val.seo?.metaDescription || "",
      },
      revisions,
    };

    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        { key: settingKey, value: updatedPayload as any, updated_by: context.userId },
        { onConflict: "key" },
      );

    if (error) throw new Error(error.message);
    return { ok: true, data: updatedPayload };
  });
