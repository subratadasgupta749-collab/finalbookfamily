import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listPrompts, updatePrompt, createPrompt, deletePrompt } from "@/lib/ai/providers.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/ai-prompts")({
  head: () => ({ meta: [{ title: "AI Prompts — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

type Prompt = Awaited<ReturnType<typeof listPrompts>>[number];

function Page() {
  const [rows, setRows] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setRows(await listPrompts()); }
    catch (e: any) { toast.error(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Prompts</h1>
          <p className="mt-1 text-muted-foreground">
            All prompts used by the app live here. Use <code>{"{{variable}}"}</code> placeholders.
            No prompt is hardcoded in the source.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="mr-2 h-4 w-4" /> New prompt</Button>
      </div>

      {showNew && <NewPrompt onDone={() => { setShowNew(false); refresh(); }} onCancel={() => setShowNew(false)} />}

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="space-y-4">
          {rows.map((p) => <PromptCard key={p.id} row={p as any} onChanged={refresh} />)}
          {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No prompts.</Card>}
        </div>
      )}
    </div>
  );
}

function PromptCard({ row, onChanged }: { row: any; onChanged: () => void }) {
  const [f, setF] = useState(row);
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(row), [row]);
  const changed = JSON.stringify(f) !== JSON.stringify(row);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{row.name}</h3>
            <Badge variant="outline">{row.key}</Badge>
          </div>
          {row.description && <p className="mt-1 text-sm text-muted-foreground">{row.description}</p>}
        </div>
        <Button size="icon" variant="ghost" onClick={async () => {
          if (!confirm(`Delete prompt "${row.name}"?`)) return;
          try { await deletePrompt({ data: { id: row.id } }); toast.success("Deleted"); onChanged(); }
          catch (e: any) { toast.error(e?.message ?? "Failed"); }
        }}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>System prompt</Label>
          <Textarea rows={4} value={f.system_prompt ?? ""} onChange={(e) => setF({ ...f, system_prompt: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>User template</Label>
          <Textarea rows={7} value={f.user_template ?? ""} onChange={(e) => setF({ ...f, user_template: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button disabled={!changed || busy} onClick={async () => {
          setBusy(true);
          try {
            await updatePrompt({ data: { id: row.id, name: f.name, description: f.description ?? null, system_prompt: f.system_prompt ?? null, user_template: f.user_template } });
            toast.success("Saved"); onChanged();
          } catch (e: any) { toast.error(e?.message ?? "Failed"); }
          finally { setBusy(false); }
        }}>{busy ? "Saving…" : "Save"}</Button>
      </div>
    </Card>
  );
}

function NewPrompt({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({ key: "", name: "", description: "", system_prompt: "", user_template: "" });
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-6 space-y-3">
      <h3 className="font-semibold">New prompt</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5"><Label>Key</Label><Input value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} placeholder="my_prompt" /></div>
        <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label>Description</Label><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>System prompt</Label><Textarea rows={3} value={f.system_prompt} onChange={(e) => setF({ ...f, system_prompt: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>User template</Label><Textarea rows={5} value={f.user_template} onChange={(e) => setF({ ...f, user_template: e.target.value })} /></div>
      <div className="flex gap-2">
        <Button disabled={busy} onClick={async () => {
          setBusy(true);
          try {
            await createPrompt({ data: {
              key: f.key, name: f.name,
              description: f.description || undefined,
              system_prompt: f.system_prompt || undefined,
              user_template: f.user_template,
            } });
            toast.success("Created"); onDone();
          } catch (e: any) { toast.error(e?.message ?? "Failed"); }
          finally { setBusy(false); }
        }}>Create</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}
