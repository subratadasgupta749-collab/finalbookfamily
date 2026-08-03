import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (
      typeof window !== "undefined" &&
      (window.location.hash.includes("access_token") || window.location.search.includes("code="))
    ) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        return { user: data.session.user };
      }
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
