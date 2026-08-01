import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAuditLogs } from "@/lib/ai/enterprise.functions";

export const Route = createFileRoute("/_authenticated/_admin/admin/ai-audit")({
  head: () => ({ meta: [{ title: "AI Audit Log — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setRows(await listAuditLogs() as any[]); }
      catch (e: any) { toast.error(e?.message ?? "Failed"); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-muted-foreground">Every AI configuration change is recorded here.</p>
      </div>
      <Card className="p-4">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <div className="text-sm">
            <table className="w-full">
              <thead className="text-xs text-muted-foreground">
                <tr><th className="text-left py-2">When</th><th className="text-left">Action</th><th className="text-left">Target</th><th className="text-left">Actor</th><th className="text-left">Details</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="pr-3"><Badge variant="outline">{r.action}</Badge></td>
                    <td className="pr-3">{r.target_type} · <span className="text-xs text-muted-foreground">{r.target_id}</span></td>
                    <td className="pr-3 text-xs">{r.actor_email ?? r.actor_id?.slice(0, 8)}</td>
                    <td className="pr-3 text-xs text-muted-foreground max-w-[300px] truncate">{JSON.stringify(r.after ?? r.before ?? {}).slice(0, 120)}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No audit entries yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
