import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  listTemplates,
  saveTemplate,
  deleteTemplate,
  sendTestEmail,
} from "@/lib/email.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminPageHeader } from "@/components/admin/table-controls";
import { toast } from "sonner";
import { Mail, Plus, Send, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/_admin/admin/email-templates",
)({
  head: () => ({
    meta: [
      { title: "Email Templates — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailTemplatesPage,
});

type Tpl = {
  id?: string;
  key: string;
  name: string;
  description?: string | null;
  subject: string;
  html_body: string;
  text_body?: string | null;
  variables: string[];
  enabled: boolean;
};

const EMPTY: Tpl = {
  key: "",
  name: "",
  description: "",
  subject: "",
  html_body: "",
  text_body: "",
  variables: [],
  enabled: true,
};

function EmailTemplatesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Tpl | null>(null);
  const [testing, setTesting] = useState<Tpl | null>(null);

  const load = () => {
    setBusy(true);
    listTemplates()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <AdminPageHeader
        title="Email Templates"
        subtitle="Dynamic templates rendered server-side. Variables use {{name}} syntax."
        actions={
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="mr-2 h-4 w-4" /> New template
          </Button>
        }
      />
      <div className="grid gap-3">
        {busy && <div className="text-sm text-muted-foreground">Loading…</div>}
        {rows.map((t) => (
          <Card key={t.id} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="font-medium">{t.name}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {t.key}
                </Badge>
                {!t.enabled && <Badge variant="secondary">Disabled</Badge>}
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {t.description || t.subject}
              </p>
              {t.variables?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.variables.map((v: string) => (
                    <code
                      key={v}
                      className="rounded bg-muted px-1.5 py-0.5 text-xs"
                    >
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTesting(t)}
              >
                <Send className="mr-1 h-3 w-3" /> Test
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  if (!confirm(`Delete template "${t.name}"?`)) return;
                  try {
                    await deleteTemplate({ data: { id: t.id } });
                    toast.success("Deleted");
                    load();
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <EditDialog
        template={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
      <TestDialog template={testing} onClose={() => setTesting(null)} />
    </div>
  );
}

function EditDialog({
  template,
  onClose,
  onSaved,
}: {
  template: Tpl | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [t, setT] = useState<Tpl | null>(template);
  const [saving, setSaving] = useState(false);
  useEffect(() => setT(template), [template]);

  if (!t) return null;

  const setField = (k: keyof Tpl, v: any) => setT({ ...t, [k]: v });

  const save = async () => {
    setSaving(true);
    try {
      await saveTemplate({
        data: {
          ...t,
          variables: Array.isArray(t.variables) ? t.variables : [],
        } as any,
      });
      toast.success("Saved");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.id ? "Edit template" : "New template"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Key</Label>
              <Input
                value={t.key}
                onChange={(e) => setField("key", e.target.value)}
                placeholder="welcome"
                disabled={!!t.id}
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={t.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Welcome Email"
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={t.description ?? ""}
              onChange={(e) => setField("description", e.target.value)}
            />
          </div>
          <div>
            <Label>Subject</Label>
            <Input
              value={t.subject}
              onChange={(e) => setField("subject", e.target.value)}
            />
          </div>
          <div>
            <Label>HTML body</Label>
            <Textarea
              rows={12}
              className="font-mono text-xs"
              value={t.html_body}
              onChange={(e) => setField("html_body", e.target.value)}
            />
          </div>
          <div>
            <Label>Text body (optional)</Label>
            <Textarea
              rows={4}
              className="font-mono text-xs"
              value={t.text_body ?? ""}
              onChange={(e) => setField("text_body", e.target.value)}
            />
          </div>
          <div>
            <Label>Variables (comma-separated)</Label>
            <Input
              value={(t.variables ?? []).join(", ")}
              onChange={(e) =>
                setField(
                  "variables",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              placeholder="name, site_name, app_url"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Enabled</Label>
              <p className="text-xs text-muted-foreground">
                Disabled templates will refuse to send.
              </p>
            </div>
            <Switch
              checked={t.enabled}
              onCheckedChange={(v) => setField("enabled", v)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestDialog({
  template,
  onClose,
}: {
  template: Tpl | null;
  onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [varsJson, setVarsJson] = useState("{}");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!template) return;
    const sample: Record<string, string> = {};
    for (const v of template.variables ?? []) sample[v] = `[${v}]`;
    setVarsJson(JSON.stringify(sample, null, 2));
  }, [template]);

  const send = async () => {
    if (!template) return;
    setSending(true);
    try {
      const variables = JSON.parse(varsJson || "{}");
      await sendTestEmail({
        data: { templateKey: template.key, to, variables },
      });
      toast.success(`Sent to ${to}`);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send test — {template?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Recipient</Label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label>Variables (JSON)</Label>
            <Textarea
              rows={8}
              className="font-mono text-xs"
              value={varsJson}
              onChange={(e) => setVarsJson(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending || !to}>
            {sending ? "Sending…" : "Send test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
