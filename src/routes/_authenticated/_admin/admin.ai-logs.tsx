import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getAiOverview, listAiLogs } from "@/lib/ai/providers.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/_admin/admin/ai-logs")({
  head: () => ({ meta: [{ title: "AI Logs — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getAiOverview>> | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const pageSize = 50;

  async function refresh() {
    try {
      const [ov, lg] = await Promise.all([
        getAiOverview(),
        listAiLogs({ data: { page, pageSize, status, provider } }),
      ]);
      setOverview(ov); setRows(lg.rows); setTotal(lg.total);
    } catch (e: any) { toast.error(e?.message ?? "Failed to load"); }
  }
  useEffect(() => { refresh(); }, [page, status, provider]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">AI Logs & Usage</h1>
        <p className="mt-1 text-muted-foreground">Every AI request is logged (provider, model, latency, tokens, status).</p>
      </div>

      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Requests today" value={overview.today.total} />
          <Stat label="Requests this month" value={overview.month.total} />
          <Stat label="Success rate (month)" value={`${overview.month.successRate}%`} />
          <Stat label="Avg response (month)" value={`${overview.month.avgMs} ms`} />
          <Stat label="Tokens in (month)" value={overview.month.tokensIn.toLocaleString()} />
          <Stat label="Tokens out (month)" value={overview.month.tokensOut.toLocaleString()} />
          <Stat label="Failed (month)" value={overview.month.error} />
          <Stat label="All-time requests" value={overview.allTime} />
        </div>
      )}

      {overview && Object.keys(overview.month.perProvider).length > 0 && (
        <Card className="p-4">
          <div className="mb-2 text-sm font-medium">Provider usage this month</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(overview.month.perProvider).map(([slug, n]) => (
              <Badge key={slug} variant="outline">{slug}: {n}</Badge>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Status</label>
            <Select value={status || "all"} onValueChange={(v) => { setPage(1); setStatus(v === "all" ? "" : v); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Provider slug</label>
            <Input value={provider} onChange={(e) => { setPage(1); setProvider(e.target.value); }} placeholder="gemini" className="w-48" />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">Showing {rows.length} of {total}</div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Provider</th>
                <th className="p-2">Model</th>
                <th className="p-2">Prompt</th>
                <th className="p-2">Status</th>
                <th className="p-2">Duration</th>
                <th className="p-2">Tokens (in/out)</th>
                <th className="p-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2">{r.provider_slug ?? "—"}</td>
                  <td className="p-2">{r.model ?? "—"}</td>
                  <td className="p-2">{r.prompt_key ?? "—"}</td>
                  <td className="p-2">{r.status === "success"
                    ? <Badge className="bg-green-600 text-white">success</Badge>
                    : <Badge variant="destructive">error</Badge>}</td>
                  <td className="p-2">{r.response_time_ms ?? 0} ms</td>
                  <td className="p-2">{r.tokens_in}/{r.tokens_out}</td>
                  <td className="p-2 text-xs text-destructive max-w-xs truncate">{r.error ?? ""}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No logs yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <div className="text-xs text-muted-foreground">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</div>
          <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </Card>
  );
}
