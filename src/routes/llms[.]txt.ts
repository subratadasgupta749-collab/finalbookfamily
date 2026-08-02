import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        let content = `# My Family History Book\n\n> A calm, private place to preserve your family's stories, photos, and voices.`;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("app_settings")
            .select("value")
            .eq("key", "seo")
            .maybeSingle();

          const seoVal = (data?.value ?? {}) as { llms_txt?: string };
          if (seoVal.llms_txt && seoVal.llms_txt.trim()) {
            content = seoVal.llms_txt.trim();
          }
        } catch (e) {
          console.error("Error fetching llms.txt from app_settings:", e);
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
