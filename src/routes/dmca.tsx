import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/dmca")({
  head: () => ({
    meta: [
      { title: "DMCA Policy — My Family History Book" },
      { name: "description", content: "Digital Millennium Copyright Act (DMCA) Notice and Takedown Policy." },
      { property: "og:title", content: "DMCA Policy — My Family History Book" },
      { property: "og:description", content: "Learn how to report copyright infringement or submit a DMCA takedown notice for content on My Family History Book." },
      { property: "og:url", content: "/dmca" },
    ],
    links: [{ rel: "canonical", href: "/dmca" }],
  }),
  component: () => (
    <SiteLayout>
      <PageShell eyebrow="Legal" title="DMCA Policy" description={`Last updated: ${new Date().toLocaleDateString()}`}>
        <p>My Family History Book respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 ("DMCA"), we will respond expeditiously to notices of alleged copyright infringement that are reported to our Designated Copyright Agent.</p>
        
        <h2>1. Reporting Copyright Infringement</h2>
        <p>If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement and is accessible on our platform, please notify our Copyright Agent with the following written information:</p>
        <ul>
          <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
          <li>Identification of the copyrighted work claimed to have been infringed, or a representative list of such works.</li>
          <li>Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled.</li>
          <li>Information reasonably sufficient to permit us to contact you, such as an address, telephone number, and email address.</li>
          <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
          <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
        </ul>
        
        <h2>2. Counter-Notification Procedures</h2>
        <p>If you believe that your content was removed or disabled by mistake or misidentification, you may submit a written counter-notification to our Designated Copyright Agent containing your contact information, identification of the removed material, and a statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification.</p>
        
        <h2>3. Repeat Infringers</h2>
        <p>It is our policy in appropriate circumstances to disable and/or terminate the accounts of users who are repeat infringers.</p>
        
        <h2>4. Designated Copyright Agent</h2>
        <p>You may send DMCA notices and counter-notifications to our Designated Agent at:</p>
        <p><strong>Email:</strong> dmca@myfamilyhistorybook.com<br /><strong>Attention:</strong> Copyright Agent</p>
      </PageShell>
    </SiteLayout>
  ),
});
