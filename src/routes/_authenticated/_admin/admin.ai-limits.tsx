import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { listUsageLimits, upsertUsageLimit, deleteUsageLimit } from "@/lib/ai/enterprise.functions";

export const Route = createFileRoute("/_authenticated/_admin/admin/ai-limits")({
  head: () => ({ meta: [{ title: "AI Usage Limits — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const SCOPES = ["global","role","user","org"] as const;

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setRows(await listUsageLimits() as any[]); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Usage Limits</h1>
          <p className="mt-1 text-muted-foreground">Cap AI usage globally, by role, by user, or by organization.</p>
        </div>
        <Button onClick={() => setEditing({ scope: "global", enabled: true })}>
          <Plus className="mr-2 h-4 w-4" /> Add limit
        </Button>
      </div>

      {editing && <LimitForm value={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{r.scope}</Badge>
                  {r.scope_id && <Badge variant="outline">{r.scope_id}</Badge>}
                  {!r.enabled && <Badge variant="destructive">off</Badge>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Requests: {r.daily_requests ?? "∞"}/day · {r.monthly_requests ?? "∞"}/month
                  {" · "}Tokens: {r.daily_tokens ?? "∞"}/day · {r.monthly_tokens ?? "∞"}/month
                  {" · "}Cost: ${r.monthly_cost_usd ?? "∞"}/mo
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm("Delete this limit?")) return;
                  try { await deleteUsageLimit({ data: { id: r.id } }); toast.success("Deleted"); refresh(); }
                  catch (e: any) { toast.error(e?.message ?? "Failed"); }
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No limits set. Usage is unlimited.</Card>}
        </div>
      )}
    </div>
  );
}

function LimitForm({ value, onCancel, onSaved }: { value: any; onCancel: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>(value);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-semibold">{value.id ? "Edit limit" : "New limit"}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5"><Label className="text-xs">Scope</Label>
          <Select value={f.scope} onValueChange={(v) => setF({ ...f, scope: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SCOPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {f.scope !== "global" && (
          <div className="space-y-1.5"><Label className="text-xs">Scope ID ({f.scope} name/id)</Label>
            <Input value={f.scope_id ?? ""} onChange={(e) => setF({ ...f, scope_id: e.target.value })} />
          </div>
        )}
        <div className="space-y-1.5"><Label className="text-xs">Daily requests</Label><Input type="number" value={f.daily_requests ?? ""} onChange={(e) => setF({ ...f, daily_requests: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Monthly requests</Label><Input type="number" value={f.monthly_requests ?? ""} onChange={(e) => setF({ ...f, monthly_requests: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Daily tokens</Label><Input type="number" value={f.daily_tokens ?? ""} onChange={(e) => setF({ ...f, daily_tokens: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Monthly tokens</Label><Input type="number" value={f.monthly_tokens ?? ""} onChange={(e) => setF({ ...f, monthly_tokens: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Monthly cost cap (USD)</Label><Input type="number" step="0.01" value={f.monthly_cost_usd ?? ""} onChange={(e) => setF({ ...f, monthly_cost_usd: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><Switch checked={!!f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} /> Enabled</label></div>
      </div>
      <div className="flex gap-2">
        <Button disabled={busy} onClick={async () => {
          setBusy(true);
          try {
            await upsertUsageLimit({ data: {
              id: f.id, scope: f.scope, scope_id: f.scope === "global" ? null : (f.scope_id || null),
              daily_requests: f.daily_requests, monthly_requests: f.monthly_requests,
              daily_tokens: f.daily_tokens, monthly_tokens: f.monthly_tokens,
              monthly_cost_usd: f.monthly_cost_usd, enabled: !!f.enabled,
            } as any });
            toast.success("Saved"); onSaved();
          } catch (e: any) { toast.error(e?.message ?? "Failed"); }
          finally { setBusy(false); }
        }}>{busy ? "Saving…" : "Save"}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}
