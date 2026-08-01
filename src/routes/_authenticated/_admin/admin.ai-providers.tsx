import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listProviders,
  updateProvider,
  createProvider,
  deleteProvider,
  setDefaultProvider,
  reorderProviders,
  testProviderConnection,
} from "@/lib/ai/providers.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, CheckCircle2, Plus, Star, Trash2, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/ai-providers")({
  head: () => ({ meta: [{ title: "AI Providers — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

type Provider = Awaited<ReturnType<typeof listProviders>>[number] & Record<string, any>;

function Page() {
  const [rows, setRows] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setRows(await listProviders() as Provider[]); }
    catch (e: any) { toast.error(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
    try {
      await reorderProviders({ data: { order: next.map((r) => r.id) } });
    } catch (e: any) { toast.error(e?.message ?? "Failed to reorder"); refresh(); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Providers</h1>
          <p className="mt-1 text-muted-foreground">
            All AI providers are managed here. The backend picks the default provider and falls back
            to the next enabled one in priority order.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="mr-2 h-4 w-4" /> Add provider</Button>
      </div>

      {showNew && <NewProviderForm onDone={() => { setShowNew(false); refresh(); }} onCancel={() => setShowNew(false)} />}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-4">
          {rows.map((r, i) => (
            <ProviderCard
              key={r.id}
              row={r}
              onUp={() => move(i, -1)}
              onDown={() => move(i, 1)}
              onChanged={refresh}
              isFirst={i === 0}
              isLast={i === rows.length - 1}
            />
          ))}
          {rows.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No providers yet. Add one to get started.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function NewProviderForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({ slug: "", name: "", provider_type: "openai_compatible" as const, base_url: "", default_model: "" });
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-6">
      <h2 className="font-semibold">New provider</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Slug (a-z, 0-9, -)"><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="claude" /></Field>
        <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Anthropic Claude" /></Field>
        <Field label="Type">
          <Select value={f.provider_type} onValueChange={(v) => setF({ ...f, provider_type: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="openai_compatible">OpenAI-compatible</SelectItem>
              <SelectItem value="gemini">Google Gemini</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="lovable">Lovable AI Gateway</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Base URL"><Input value={f.base_url} onChange={(e) => setF({ ...f, base_url: e.target.value })} placeholder="https://api.anthropic.com" /></Field>
        <Field label="Default model"><Input value={f.default_model} onChange={(e) => setF({ ...f, default_model: e.target.value })} placeholder="claude-3-5-sonnet-latest" /></Field>
      </div>
      <div className="mt-4 flex gap-2">
        <Button disabled={busy} onClick={async () => {
          setBusy(true);
          try {
            await createProvider({ data: {
              slug: f.slug, name: f.name, provider_type: f.provider_type,
              base_url: f.base_url || undefined, default_model: f.default_model || undefined,
            } });
            toast.success("Provider added"); onDone();
          } catch (e: any) { toast.error(e?.message ?? "Failed"); }
          finally { setBusy(false); }
        }}>Create</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

function ProviderCard({
  row, onUp, onDown, onChanged, isFirst, isLast,
}: { row: Provider; onUp: () => void; onDown: () => void; onChanged: () => void; isFirst: boolean; isLast: boolean }) {
  const [f, setF] = useState<any>(row);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  useEffect(() => { setF(row); setApiKey(""); }, [row]);

  const changed = JSON.stringify(f) !== JSON.stringify(row) || apiKey.length > 0;

  async function save() {
    setBusy(true);
    try {
      const patch: any = {
        id: row.id,
        name: f.name,
        provider_type: f.provider_type,
        enabled: f.enabled,
        base_url: f.base_url || null,
        default_model: f.default_model || null,
        system_prompt: f.system_prompt || null,
        max_tokens: numOrNull(f.max_tokens),
        temperature: numOrNull(f.temperature),
        top_p: numOrNull(f.top_p),
        frequency_penalty: numOrNull(f.frequency_penalty),
        presence_penalty: numOrNull(f.presence_penalty),
        timeout_ms: Number(f.timeout_ms) || 60000,
        retry_attempts: Number(f.retry_attempts) || 0,
        priority: Number(f.priority) || 100,
        monthly_budget: numOrNull(f.monthly_budget),
        daily_token_limit: numOrNull(f.daily_token_limit),
      };
      if (apiKey.length > 0) patch.api_key = apiKey;
      await updateProvider({ data: patch });
      toast.success("Saved");
      onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  async function test() {
    setTesting(true);
    try {
      const r = await testProviderConnection({ data: { id: row.id } });
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Test failed"); }
    finally { setTesting(false); }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-1">
            <Button size="icon" variant="ghost" onClick={onUp} disabled={isFirst}><ArrowUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onDown} disabled={isLast}><ArrowDown className="h-4 w-4" /></Button>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{row.name}</h3>
              <Badge variant="outline">{row.slug}</Badge>
              <Badge variant="secondary">{row.provider_type}</Badge>
              {row.is_default && <Badge className="bg-primary text-primary-foreground"><Star className="mr-1 h-3 w-3" /> default</Badge>}
              {row.status === "ok" && <Badge className="bg-green-600 text-white"><CheckCircle2 className="mr-1 h-3 w-3" /> ok</Badge>}
              {row.status === "error" && <Badge variant="destructive">error</Badge>}
              {row.has_key ? <Badge variant="outline">key saved</Badge> : <Badge variant="destructive">no key</Badge>}
            </div>
            {row.last_test_message && (
              <div className="mt-1 text-xs text-muted-foreground truncate max-w-lg">
                Last test: {row.last_test_message}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Label htmlFor={`en-${row.id}`}>Enabled</Label>
            <Switch id={`en-${row.id}`} checked={!!f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} />
          </div>
          {!row.is_default && (
            <Button size="sm" variant="outline" onClick={async () => {
              try { await setDefaultProvider({ data: { id: row.id } }); toast.success("Default set"); onChanged(); }
              catch (e: any) { toast.error(e?.message ?? "Failed"); }
            }}><Star className="mr-1 h-4 w-4" /> Set default</Button>
          )}
          <Button size="sm" variant="outline" onClick={test} disabled={testing || !row.has_key}>
            <Zap className="mr-1 h-4 w-4" /> {testing ? "Testing…" : "Test"}
          </Button>
          <Button size="sm" variant="ghost" onClick={async () => {
            if (!confirm(`Delete provider "${row.name}"?`)) return;
            try { await deleteProvider({ data: { id: row.id } }); toast.success("Deleted"); onChanged(); }
            catch (e: any) { toast.error(e?.message ?? "Failed"); }
          }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Name"><Input value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Provider type">
          <Select value={f.provider_type} onValueChange={(v) => setF({ ...f, provider_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="openai_compatible">OpenAI-compatible</SelectItem>
              <SelectItem value="gemini">Google Gemini</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="lovable">Lovable AI Gateway</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Base URL"><Input value={f.base_url ?? ""} onChange={(e) => setF({ ...f, base_url: e.target.value })} /></Field>
        <Field label="Default model"><Input value={f.default_model ?? ""} onChange={(e) => setF({ ...f, default_model: e.target.value })} /></Field>
        <Field label={row.has_key ? "Replace API key (leave blank to keep)" : "API key"}>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-…" autoComplete="off" />
        </Field>
        <Field label="Priority (lower = tried first)"><Input type="number" value={f.priority ?? 100} onChange={(e) => setF({ ...f, priority: e.target.value })} /></Field>
        <Field label="Max tokens"><Input type="number" value={f.max_tokens ?? ""} onChange={(e) => setF({ ...f, max_tokens: e.target.value })} /></Field>
        <Field label="Temperature"><Input type="number" step="0.1" value={f.temperature ?? ""} onChange={(e) => setF({ ...f, temperature: e.target.value })} /></Field>
        <Field label="Top P"><Input type="number" step="0.05" value={f.top_p ?? ""} onChange={(e) => setF({ ...f, top_p: e.target.value })} /></Field>
        <Field label="Frequency penalty"><Input type="number" step="0.1" value={f.frequency_penalty ?? ""} onChange={(e) => setF({ ...f, frequency_penalty: e.target.value })} /></Field>
        <Field label="Presence penalty"><Input type="number" step="0.1" value={f.presence_penalty ?? ""} onChange={(e) => setF({ ...f, presence_penalty: e.target.value })} /></Field>
        <Field label="Timeout (ms)"><Input type="number" value={f.timeout_ms ?? 60000} onChange={(e) => setF({ ...f, timeout_ms: e.target.value })} /></Field>
        <Field label="Retry attempts"><Input type="number" value={f.retry_attempts ?? 0} onChange={(e) => setF({ ...f, retry_attempts: e.target.value })} /></Field>
        <Field label="Monthly budget"><Input type="number" step="0.01" value={f.monthly_budget ?? ""} onChange={(e) => setF({ ...f, monthly_budget: e.target.value })} /></Field>
        <Field label="Daily token limit"><Input type="number" value={f.daily_token_limit ?? ""} onChange={(e) => setF({ ...f, daily_token_limit: e.target.value })} /></Field>
        <div className="md:col-span-2">
          <Field label="System prompt (optional, prepended to every request)">
            <Textarea rows={3} value={f.system_prompt ?? ""} onChange={(e) => setF({ ...f, system_prompt: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <div>Last updated: {row.updated_at ? new Date(row.updated_at).toLocaleString() : "—"} · Last tested: {row.last_tested_at ? new Date(row.last_tested_at).toLocaleString() : "never"}</div>
        <Button onClick={save} disabled={!changed || busy}>{busy ? "Saving…" : "Save"}</Button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function numOrNull(v: any): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
