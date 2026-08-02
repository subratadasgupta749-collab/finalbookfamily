import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        let content = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /auth\n\nSitemap: https://myfamilyhistorybook.com/sitemap.xml`;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("app_settings")
            .select("value")
            .eq("key", "seo")
            .maybeSingle();

          const seoVal = (data?.value ?? {}) as { robots_txt?: string };
          if (seoVal.robots_txt && seoVal.robots_txt.trim()) {
            content = seoVal.robots_txt.trim();
          }
        } catch (e) {
          console.error("Error fetching robots.txt from app_settings:", e);
        }

        return new Response(content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
