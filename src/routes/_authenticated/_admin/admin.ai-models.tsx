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
import { listModels, upsertModel, deleteModel } from "@/lib/ai/enterprise.functions";
import { listProviders } from "@/lib/ai/providers.functions";

export const Route = createFileRoute("/_authenticated/_admin/admin/ai-models")({
  head: () => ({ meta: [{ title: "AI Models — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const CATEGORIES = ["text","vision","reasoning","embedding","speech","image","code"] as const;

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([listModels(), listProviders()]);
      setRows(m as any[]); setProviders(p as any[]);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Models</h1>
          <p className="mt-1 text-muted-foreground">Manage models per provider with category, context window, and pricing.</p>
        </div>
        <Button onClick={() => setEditing({ provider_id: providers[0]?.id ?? "", category: "text", enabled: true, cost_input_per_1k: 0, cost_output_per_1k: 0, supports_streaming: true, supports_json_mode: false, is_default: false, status: "active" })}>
          <Plus className="mr-2 h-4 w-4" /> Add model
        </Button>
      </div>

      {editing && <ModelForm value={editing} providers={providers} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-medium">{r.label || r.name}</div>
                  <Badge variant="outline">{r.name}</Badge>
                  <Badge variant="secondary">{r.category}</Badge>
                  <Badge variant="outline">{r.ai_providers?.slug}</Badge>
                  {r.is_default && <Badge>default</Badge>}
                  {!r.enabled && <Badge variant="destructive">disabled</Badge>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  ctx: {r.context_window ?? "—"} · in ${Number(r.cost_input_per_1k).toFixed(4)}/1K · out ${Number(r.cost_output_per_1k).toFixed(4)}/1K
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm(`Delete model ${r.name}?`)) return;
                  try { await deleteModel({ data: { id: r.id } }); toast.success("Deleted"); refresh(); }
                  catch (e: any) { toast.error(e?.message ?? "Failed"); }
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No models yet.</Card>}
        </div>
      )}
    </div>
  );
}

function ModelForm({ value, providers, onSaved, onCancel }: { value: any; providers: any[]; onSaved: () => void; onCancel: () => void }) {
  const [f, setF] = useState<any>(value);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-semibold">{value.id ? "Edit model" : "New model"}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <F label="Provider">
          <Select value={f.provider_id} onValueChange={(v) => setF({ ...f, provider_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Model name (id)"><Input value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="gpt-4o-mini" /></F>
        <F label="Label"><Input value={f.label ?? ""} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="GPT-4o mini" /></F>
        <F label="Category">
          <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Context window"><Input type="number" value={f.context_window ?? ""} onChange={(e) => setF({ ...f, context_window: e.target.value ? Number(e.target.value) : null })} /></F>
        <F label="Max tokens"><Input type="number" value={f.max_tokens ?? ""} onChange={(e) => setF({ ...f, max_tokens: e.target.value ? Number(e.target.value) : null })} /></F>
        <F label="Cost input / 1K tokens (USD)"><Input type="number" step="0.0001" value={f.cost_input_per_1k ?? 0} onChange={(e) => setF({ ...f, cost_input_per_1k: Number(e.target.value) })} /></F>
        <F label="Cost output / 1K tokens (USD)"><Input type="number" step="0.0001" value={f.cost_output_per_1k ?? 0} onChange={(e) => setF({ ...f, cost_output_per_1k: Number(e.target.value) })} /></F>
        <F label="Status">
          <Select value={f.status ?? "active"} onValueChange={(v) => setF({ ...f, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="deprecated">deprecated</SelectItem>
              <SelectItem value="beta">beta</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} /> Enabled</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!f.is_default} onCheckedChange={(v) => setF({ ...f, is_default: v })} /> Default</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!f.supports_streaming} onCheckedChange={(v) => setF({ ...f, supports_streaming: v })} /> Streaming</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!f.supports_json_mode} onCheckedChange={(v) => setF({ ...f, supports_json_mode: v })} /> JSON mode</label>
        </div>
      </div>
      <div className="flex gap-2">
        <Button disabled={busy || !f.provider_id || !f.name} onClick={async () => {
          setBusy(true);
          try {
            await upsertModel({ data: {
              id: f.id, provider_id: f.provider_id, name: f.name, label: f.label || null,
              category: f.category, context_window: f.context_window ?? null, max_tokens: f.max_tokens ?? null,
              cost_input_per_1k: Number(f.cost_input_per_1k) || 0, cost_output_per_1k: Number(f.cost_output_per_1k) || 0,
              supports_streaming: !!f.supports_streaming, supports_json_mode: !!f.supports_json_mode,
              is_default: !!f.is_default, enabled: !!f.enabled, status: f.status || "active",
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
