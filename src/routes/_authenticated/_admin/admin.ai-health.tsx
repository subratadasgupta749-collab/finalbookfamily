import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { runHealthCheckAll, listHealthHistory } from "@/lib/ai/enterprise.functions";
import { listProviders } from "@/lib/ai/providers.functions";

export const Route = createFileRoute("/_authenticated/_admin/admin/ai-health")({
  head: () => ({ meta: [{ title: "AI Health — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const [providers, setProviders] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([listProviders(), listHealthHistory()]);
      setProviders(p as any[]); setHistory(h as any[]);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function runAll() {
    setRunning(true);
    try {
      const r = await runHealthCheckAll();
      toast.success(`${(r as any[]).filter((x) => x.ok).length}/${(r as any[]).length} healthy`);
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setRunning(false); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Provider Health</h1>
          <p className="mt-1 text-muted-foreground">Live status, latency, uptime and last error per provider.</p>
        </div>
        <Button onClick={runAll} disabled={running}>
          <RefreshCw className={`mr-2 h-4 w-4 ${running ? "animate-spin" : ""}`} /> Run health check
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => {
              const ok = p.health_status === "healthy" || p.status === "ok";
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{p.name}</div>
                    {ok ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <div>Status: <Badge variant={ok ? "secondary" : "destructive"}>{p.health_status ?? p.status ?? "unknown"}</Badge></div>
                    <div>Latency: {p.last_latency_ms ?? "—"} ms</div>
                    <div>Last check: {p.last_health_check ? new Date(p.last_health_check).toLocaleString() : "never"}</div>
                    {p.last_error && <div className="text-red-600 truncate" title={p.last_error}>Error: {p.last_error}</div>}
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4" /> Recent history</h2>
            <div className="max-h-96 overflow-auto text-sm">
              <table className="w-full">
                <thead className="text-xs text-muted-foreground">
                  <tr><th className="text-left py-2">When</th><th className="text-left">Provider</th><th className="text-left">OK</th><th className="text-left">Latency</th><th className="text-left">Error</th></tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(h.checked_at).toLocaleString()}</td>
                      <td className="pr-3">{h.ai_providers?.name ?? "—"}</td>
                      <td className="pr-3">{h.ok ? "✓" : "✗"}</td>
                      <td className="pr-3">{h.latency_ms ?? "—"} ms</td>
                      <td className="pr-3 truncate max-w-[300px]" title={h.error ?? ""}>{h.error ?? ""}</td>
                    </tr>
                  ))}
                  {history.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No history yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
