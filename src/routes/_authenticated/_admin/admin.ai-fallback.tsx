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
import { Plus, Trash2, X } from "lucide-react";
import { listFallbackRules, upsertFallbackRule, deleteFallbackRule } from "@/lib/ai/enterprise.functions";
import { listProviders } from "@/lib/ai/providers.functions";

export const Route = createFileRoute("/_authenticated/_admin/admin/ai-fallback")({
  head: () => ({ meta: [{ title: "AI Fallback Rules — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const TRIGGERS = ["rate_limit","timeout","api_error","quota","server_error","invalid_response","offline"] as const;

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([listFallbackRules(), listProviders()]);
      setRows(r as any[]); setProviders(p as any[]);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const providerName = (id: string) => providers.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Fallback Rules</h1>
          <p className="mt-1 text-muted-foreground">Configure which providers to try when a specific trigger fires per feature.</p>
        </div>
        <Button onClick={() => setEditing({ feature_key: "", trigger: "api_error", fallback_provider_ids: [], enabled: true })}>
          <Plus className="mr-2 h-4 w-4" /> Add rule
        </Button>
      </div>

      {editing && <RuleForm value={editing} providers={providers} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{r.feature_key}</Badge>
                    <Badge variant="secondary">{r.trigger}</Badge>
                    {!r.enabled && <Badge variant="destructive">off</Badge>}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Chain: {(r.fallback_provider_ids ?? []).map(providerName).join(" → ") || "—"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!confirm("Delete this rule?")) return;
                    try { await deleteFallbackRule({ data: { id: r.id } }); toast.success("Deleted"); refresh(); }
                    catch (e: any) { toast.error(e?.message ?? "Failed"); }
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No fallback rules yet.</Card>}
        </div>
      )}
    </div>
  );
}

function RuleForm({ value, providers, onCancel, onSaved }: { value: any; providers: any[]; onCancel: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({ ...value, fallback_provider_ids: value.fallback_provider_ids ?? [] });
  const [busy, setBusy] = useState(false);
  const nameOf = (id: string) => providers.find((p) => p.id === id)?.name ?? id;

  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-semibold">{value.id ? "Edit rule" : "New rule"}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5"><Label className="text-xs">Feature key</Label><Input value={f.feature_key} onChange={(e) => setF({ ...f, feature_key: e.target.value })} placeholder="interview" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Trigger</Label>
          <Select value={f.trigger} onValueChange={(v) => setF({ ...f, trigger: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><Switch checked={!!f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} /> Enabled</label></div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Fallback providers (in order)</Label>
        <div className="space-y-1">
          {f.fallback_provider_ids.map((id: string, i: number) => (
            <div key={id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <span className="text-xs text-muted-foreground w-6">#{i + 1}</span>
              <span className="flex-1">{nameOf(id)}</span>
              <Button size="icon" variant="ghost" onClick={() => setF({ ...f, fallback_provider_ids: f.fallback_provider_ids.filter((_: string, j: number) => j !== i) })}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        <Select value="" onValueChange={(id) => { if (!f.fallback_provider_ids.includes(id)) setF({ ...f, fallback_provider_ids: [...f.fallback_provider_ids, id] }); }}>
          <SelectTrigger><SelectValue placeholder="+ Add provider" /></SelectTrigger>
          <SelectContent>
            {providers.filter((p) => !f.fallback_provider_ids.includes(p.id)).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button disabled={busy || !f.feature_key} onClick={async () => {
          setBusy(true);
          try {
            await upsertFallbackRule({ data: {
              id: f.id, feature_key: f.feature_key, trigger: f.trigger,
              fallback_provider_ids: f.fallback_provider_ids, enabled: !!f.enabled,
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
