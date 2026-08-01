import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/table-controls";
import { toast } from "sonner";
import { Loader2, RefreshCw, Database, HardDrive, Trash2, RotateCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/cache")({
  head: () => ({ meta: [{ title: "Cache Manager — Admin" }, { name: "robots", content: "noindex" }] }),
  component: CachePage,
});

const AUTH_KEY_PREFIXES = ["sb-", "supabase.auth."];

function isAuthKey(key: string) {
  return AUTH_KEY_PREFIXES.some((p) => key.startsWith(p));
}

function CachePage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (id: string, fn: () => Promise<void> | void, ok: string) => {
    setBusy(id);
    try {
      await fn();
      toast.success(ok);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const clearQueryCache = () =>
    run("query", async () => {
      qc.clear();
      await qc.invalidateQueries();
    }, "App data cache cleared");

  const clearStorage = () =>
    run("storage", async () => {
      const keep: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && isAuthKey(k)) keep[k] = localStorage.getItem(k) ?? "";
      }
      localStorage.clear();
      sessionStorage.clear();
      for (const [k, v] of Object.entries(keep)) localStorage.setItem(k, v);
    }, "Browser storage cleared (session preserved)");

  const clearServiceWorker = () =>
    run("sw", async () => {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    }, "Service worker & browser caches cleared");

  const clearAll = () =>
    run("all", async () => {
      qc.clear();
      const keep: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && isAuthKey(k)) keep[k] = localStorage.getItem(k) ?? "";
      }
      localStorage.clear();
      sessionStorage.clear();
      for (const [k, v] of Object.entries(keep)) localStorage.setItem(k, v);
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    }, "All caches cleared");

  const hardReload = () =>
    run("reload", async () => {
      window.location.reload();
    }, "Reloading…");

  const items: Array<{ id: string; title: string; desc: string; icon: any; action: () => void; variant?: any }> = [
    {
      id: "query",
      title: "App data cache",
      desc: "Clear all in-memory query cache and refetch data on next view.",
      icon: Database,
      action: clearQueryCache,
    },
    {
      id: "storage",
      title: "Browser storage",
      desc: "Wipe localStorage & sessionStorage. Signed-in session is preserved.",
      icon: HardDrive,
      action: clearStorage,
    },
    {
      id: "sw",
      title: "Service worker & offline cache",
      desc: "Unregister service workers and delete Cache Storage entries.",
      icon: RefreshCw,
      action: clearServiceWorker,
    },
    {
      id: "all",
      title: "Clear everything",
      desc: "Run all of the above in one go.",
      icon: Trash2,
      action: clearAll,
      variant: "destructive",
    },
    {
      id: "reload",
      title: "Hard reload",
      desc: "Force a full page reload to pick up the freshest build.",
      icon: RotateCw,
      action: hardReload,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminPageHeader
        title="Cache Manager"
        subtitle="Clear client-side caches to see the latest changes without asking users to hard-refresh."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map(({ id, title, desc, icon: Icon, action, variant }) => (
          <Card key={id} className="flex flex-col gap-3 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
            <Button
              onClick={action}
              disabled={busy !== null}
              variant={variant ?? "default"}
              className="mt-auto self-start"
            >
              {busy === id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
              {busy === id ? "Working…" : title}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-5 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Note:</strong> These actions only clear caches in <em>your</em>{" "}
          browser. Server-side data in the database is never affected. Ask other users to visit the site again
          or hard-refresh (Ctrl/Cmd + Shift + R) to fetch fresh assets.
        </p>
      </Card>
    </div>
  );
}
