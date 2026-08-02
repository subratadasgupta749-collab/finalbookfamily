import { createFileRoute } from "@tanstack/react-router";
import { getLegalPage, type LegalPageData } from "@/lib/legal.functions";
import { LegalPageViewer } from "@/components/legal-page-viewer";

export const Route = createFileRoute("/privacy")({
  loader: () => getLegalPage({ data: { slug: "privacy" } }),
  head: ({ loaderData }) => {
    const data = loaderData as LegalPageData | undefined;
    const seo = data?.seo ?? {
      metaTitle: "Privacy Policy — My Family History Book",
      metaDescription: "How My Family History Book protects your personal data and family stories.",
    };
    const canonical = seo.canonicalUrl || "https://myfamilyhistorybook.com/privacy";
    return {
      meta: [
        { title: seo.metaTitle || "Privacy Policy — My Family History Book" },
        { name: "description", content: seo.metaDescription },
        { property: "og:title", content: seo.ogTitle || seo.metaTitle },
        { property: "og:description", content: seo.ogDescription || seo.metaDescription },
        { property: "og:url", content: canonical },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: seo.twitterTitle || seo.metaTitle },
        { name: "twitter:description", content: seo.twitterDescription || seo.metaDescription },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: PrivacyRoute,
});

function PrivacyRoute() {
  const data = Route.useLoaderData();
  return <LegalPageViewer data={data} />;
}
