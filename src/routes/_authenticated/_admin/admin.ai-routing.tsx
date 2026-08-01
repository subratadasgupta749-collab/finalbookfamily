import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { listRoutingRules, upsertRoutingRule, deleteRoutingRule } from "@/lib/ai/enterprise.functions";

export const Route = createFileRoute("/_authenticated/_admin/admin/ai-routing")({
  head: () => ({ meta: [{ title: "AI Routing — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const STRATEGIES = ["priority","cheapest","fastest","quality","region","random","weighted","manual","round_robin","default"] as const;

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setRows(await listRoutingRules() as any[]); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Routing Rules</h1>
          <p className="mt-1 text-muted-foreground">Global smart-routing strategies (priority, cheapest, fastest, weighted, etc.).</p>
        </div>
        <Button onClick={() => setEditing({ name: "", strategy: "priority", active: true, priority: 100, filters: {} })}>
          <Plus className="mr-2 h-4 w-4" /> Add rule
        </Button>
      </div>

      {editing && <RuleForm value={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.name}</span>
                  <Badge variant="secondary">{r.strategy}</Badge>
                  {!r.active && <Badge variant="destructive">off</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Priority: {r.priority}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm(`Delete rule ${r.name}?`)) return;
                  try { await deleteRoutingRule({ data: { id: r.id } }); toast.success("Deleted"); refresh(); }
                  catch (e: any) { toast.error(e?.message ?? "Failed"); }
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No routing rules yet.</Card>}
        </div>
      )}
    </div>
  );
}

function RuleForm({ value, onCancel, onSaved }: { value: any; onCancel: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({ ...value, filtersJson: JSON.stringify(value.filters ?? {}, null, 2) });
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-semibold">{value.id ? "Edit rule" : "New rule"}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Strategy</Label>
          <Select value={f.strategy} onValueChange={(v) => setF({ ...f, strategy: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STRATEGIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Priority</Label><Input type="number" value={f.priority} onChange={(e) => setF({ ...f, priority: Number(e.target.value) })} /></div>
        <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><Switch checked={!!f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /> Active</label></div>
        <div className="md:col-span-2 space-y-1.5">
          <Label className="text-xs">Filters (JSON, e.g. {`{"region":"us","category":"text"}`})</Label>
          <Textarea rows={4} value={f.filtersJson} onChange={(e) => setF({ ...f, filtersJson: e.target.value })} className="font-mono text-xs" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button disabled={busy || !f.name} onClick={async () => {
          setBusy(true);
          let filters: any = {};
          try { filters = JSON.parse(f.filtersJson || "{}"); }
          catch { toast.error("Filters must be valid JSON"); setBusy(false); return; }
          try {
            await upsertRoutingRule({ data: { id: f.id, name: f.name, strategy: f.strategy, filters, active: !!f.active, priority: Number(f.priority) || 100 } as any });
            toast.success("Saved"); onSaved();
          } catch (e: any) { toast.error(e?.message ?? "Failed"); }
          finally { setBusy(false); }
        }}>{busy ? "Saving…" : "Save"}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}
