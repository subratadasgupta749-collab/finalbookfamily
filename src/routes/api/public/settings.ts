import { createFileRoute } from "@tanstack/react-router";
import { getPublicSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/api/public/settings")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const data = await getPublicSettings();
          return new Response(JSON.stringify({ ok: true, data }), {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "public, max-age=30, s-maxage=60",
              "access-control-allow-origin": "*",
            },
          });
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: e?.message ?? "error" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
          },
        }),
    },
  },
});
