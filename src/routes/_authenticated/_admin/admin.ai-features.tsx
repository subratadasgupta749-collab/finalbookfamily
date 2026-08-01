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
import { Plus, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";
import { listFeatureMappings, upsertFeatureMapping, deleteFeatureMapping } from "@/lib/ai/enterprise.functions";
import { listProviders } from "@/lib/ai/providers.functions";

export const Route = createFileRoute("/_authenticated/_admin/admin/ai-features")({
  head: () => ({ meta: [{ title: "AI Feature Mapping — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const STRATEGIES = ["priority","cheapest","fastest","quality","region","random","weighted","manual","round_robin","default"] as const;

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([listFeatureMappings(), listProviders()]);
      setRows(m as any[]); setProviders(p as any[]);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Feature Mapping</h1>
          <p className="mt-1 text-muted-foreground">Route each product feature to its primary provider/model and fallback chain.</p>
        </div>
        <Button onClick={() => setEditing({ feature_key: "", label: "", routing_strategy: "priority", enabled: true, fallback_chain: [] })}>
          <Plus className="mr-2 h-4 w-4" /> Add mapping
        </Button>
      </div>

      {editing && <MapForm value={editing} providers={providers} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{r.label}</span>
                  <Badge variant="outline">{r.feature_key}</Badge>
                  <Badge variant="secondary">{r.routing_strategy}</Badge>
                  {!r.enabled && <Badge variant="destructive">disabled</Badge>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Primary: {providers.find((p) => p.id === r.primary_provider_id)?.name ?? "—"} · Model: {r.primary_model ?? "provider default"} · Fallbacks: {(r.fallback_chain ?? []).length}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm(`Delete mapping ${r.feature_key}?`)) return;
                  try { await deleteFeatureMapping({ data: { id: r.id } }); toast.success("Deleted"); refresh(); }
                  catch (e: any) { toast.error(e?.message ?? "Failed"); }
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No feature mappings yet.</Card>}
        </div>
      )}
    </div>
  );
}

function MapForm({ value, providers, onSaved, onCancel }: { value: any; providers: any[]; onSaved: () => void; onCancel: () => void }) {
  const [f, setF] = useState<any>({ ...value, fallback_chain: value.fallback_chain ?? [] });
  const [busy, setBusy] = useState(false);
  const providerById = (id: string) => providers.find((p) => p.id === id);

  function addFallback(id: string) {
    if (!id || f.fallback_chain.includes(id)) return;
    setF({ ...f, fallback_chain: [...f.fallback_chain, id] });
  }
  function removeFallback(i: number) {
    const next = [...f.fallback_chain]; next.splice(i, 1);
    setF({ ...f, fallback_chain: next });
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= f.fallback_chain.length) return;
    const next = [...f.fallback_chain]; [next[i], next[j]] = [next[j], next[i]];
    setF({ ...f, fallback_chain: next });
  }

  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-semibold">{value.id ? "Edit mapping" : "New mapping"}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <F label="Feature key (a-z, 0-9, _)"><Input value={f.feature_key} onChange={(e) => setF({ ...f, feature_key: e.target.value })} placeholder="interview" /></F>
        <F label="Label"><Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="AI Interview" /></F>
        <F label="Primary provider">
          <Select value={f.primary_provider_id ?? ""} onValueChange={(v) => setF({ ...f, primary_provider_id: v || null })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Primary model (blank = provider default)"><Input value={f.primary_model ?? ""} onChange={(e) => setF({ ...f, primary_model: e.target.value })} /></F>
        <F label="Routing strategy">
          <Select value={f.routing_strategy} onValueChange={(v) => setF({ ...f, routing_strategy: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STRATEGIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><Switch checked={!!f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} /> Enabled</label></div>
        <div className="md:col-span-2">
          <F label="Description"><Textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></F>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Fallback chain (tried in order after primary)</Label>
        <div className="space-y-2">
          {f.fallback_chain.map((id: string, i: number) => (
            <div key={id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === f.fallback_chain.length - 1}><ArrowDown className="h-3 w-3" /></Button>
              <span className="flex-1">{providerById(id)?.name ?? id}</span>
              <Button size="icon" variant="ghost" onClick={() => removeFallback(i)}><X className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <Select value="" onValueChange={addFallback}>
          <SelectTrigger><SelectValue placeholder="+ Add fallback provider" /></SelectTrigger>
          <SelectContent>
            {providers.filter((p) => !f.fallback_chain.includes(p.id) && p.id !== f.primary_provider_id).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button disabled={busy || !f.feature_key || !f.label} onClick={async () => {
          setBusy(true);
          try {
            await upsertFeatureMapping({ data: {
              id: f.id, feature_key: f.feature_key, label: f.label, description: f.description || null,
              primary_provider_id: f.primary_provider_id || null, primary_model: f.primary_model || null,
              fallback_chain: f.fallback_chain, routing_strategy: f.routing_strategy, enabled: !!f.enabled,
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
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
