import { createFileRoute } from "@tanstack/react-router";
import { getLegalPage, type LegalPageData } from "@/lib/legal.functions";
import { LegalPageViewer } from "@/components/legal-page-viewer";

export const Route = createFileRoute("/cookie-policy")({
  loader: () => getLegalPage({ data: { slug: "cookies" } }),
  head: ({ loaderData }) => {
    const data = loaderData as LegalPageData | undefined;
    const seo = data?.seo ?? {
      metaTitle: "Cookie Policy — My Family History Book",
      metaDescription: "Overview of essential, functional, and analytics cookies utilized on My Family History Book.",
    };
    const canonical = seo.canonicalUrl || "https://myfamilyhistorybook.com/cookie-policy";
    return {
      meta: [
        { title: seo.metaTitle || "Cookie Policy — My Family History Book" },
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
  component: CookiePolicyRoute,
});

function CookiePolicyRoute() {
  const data = (Route as any).useLoaderData() as LegalPageData;
  return <LegalPageViewer data={data} />;
}
