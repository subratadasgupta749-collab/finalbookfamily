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
import { Mail, Plus, Send, Trash2, Pencil, RefreshCw, AlertTriangle } from "lucide-react";

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
  errorComponent: EmailTemplatesErrorComponent,
});

type Tpl = {
  id?: string;
  key: string;
  name: string;
  description?: string | null;
  category?: string;
  subject: string;
  html_body: string;
  text_body?: string | null;
  variables?: string[];
  enabled?: boolean;
};

const EMPTY: Tpl = {
  key: "",
  name: "",
  description: "",
  category: "transactional",
  subject: "",
  html_body: "",
  text_body: "",
  variables: ["user_name", "app_url"],
  enabled: true,
};

function EmailTemplatesErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("[EmailTemplates Error Boundary Caught Exception]:", error);
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <Card className="p-6 border-destructive/50 bg-destructive/5 space-y-3">
        <div className="flex items-center gap-2 text-destructive font-semibold text-base">
          <AlertTriangle className="h-5 w-5" />
          Email Templates Error
        </div>
        <p className="text-sm text-muted-foreground">
          {error?.message ?? "An unexpected error occurred while rendering email templates."}
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Button size="sm" onClick={() => reset()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry Page
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            Reload Application
          </Button>
        </div>
      </Card>
    </div>
  );
}

function EmailTemplatesPage() {
  const [rows, setRows] = useState<Tpl[]>([]);
  const [busy, setBusy] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<Tpl | null>(null);
  const [testing, setTesting] = useState<Tpl | null>(null);

  useEffect(() => {
    console.log("[EmailTemplates] Component Loaded");
  }, []);

  const load = async () => {
    setBusy(true);
    setErrorMsg(null);
    console.log("[EmailTemplates] API Started: Fetching email templates");

    try {
      const res = await listTemplates();
      console.log("[EmailTemplates] API Success:", res);

      const items = Array.isArray(res) ? res : [];
      setRows(items);
    } catch (e: any) {
      const errText = e?.message ?? String(e);
      console.error("[EmailTemplates] API Failed:", errText, e);
      setErrorMsg(errText);
      toast.error(`Failed to load templates: ${errText}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <AdminPageHeader
        title="Email Templates"
        subtitle="Dynamic transactional & marketing templates with {{variable}} interpolation."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={busy}>
              <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button onClick={() => setEditing({ ...EMPTY })}>
              <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
          </div>
        }
      />

      {errorMsg && (
        <Card className="p-4 border-destructive/50 bg-destructive/5 flex items-center justify-between gap-4">
          <div className="text-sm text-destructive font-medium">
            Error loading templates: {errorMsg}
          </div>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </Button>
        </Card>
      )}

      {busy ? (
        <Card className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          Loading templates…
        </Card>
      ) : !Array.isArray(rows) || rows.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <Mail className="h-10 w-10 text-muted-foreground mx-auto" />
          <div className="font-medium text-base">No templates found</div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Get started by creating your first transactional or newsletter email template.
          </p>
          <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="mr-1.5 h-4 w-4" /> Create Your First Template
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((t) => (
            <Card key={t.id || t.key} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">{t?.name || t?.key || "Untitled Template"}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {t?.key ?? "no_key"}
                  </Badge>
                  {t?.category && <Badge variant="secondary">{t.category}</Badge>}
                  {t?.enabled === false && <Badge variant="destructive">Disabled</Badge>}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {t?.description || t?.subject || "No subject set"}
                </p>
                {Array.isArray(t?.variables) && t.variables.length > 0 && (
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
              <div className="flex shrink-0 items-center gap-1">
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
                    if (!confirm(`Delete template "${t?.name || t?.key}"?`)) return;
                    try {
                      if (t.id) {
                        await deleteTemplate({ data: { id: t.id } });
                        toast.success("Deleted");
                      }
                      load();
                    } catch (e: any) {
                      toast.error(e?.message ?? "Delete failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <EditDialog
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {testing && <TestDialog template={testing} onClose={() => setTesting(null)} />}
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
          id: t.id,
          key: t.key || "custom_template",
          name: t.name || "Custom Template",
          description: t.description || null,
          category: (t.category as any) || "transactional",
          subject: t.subject || "Subject",
          html_body: t.html_body || "<p>Hello</p>",
          text_body: t.text_body || null,
          variables: Array.isArray(t.variables) ? t.variables : [],
          enabled: t.enabled !== false,
        },
      });
      toast.success("Template saved");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.id ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Key (slug)</Label>
              <Input
                value={t.key ?? ""}
                onChange={(e) => setField("key", e.target.value)}
                placeholder="welcome"
                disabled={!!t.id}
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={t.name ?? ""}
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
              value={t.subject ?? ""}
              onChange={(e) => setField("subject", e.target.value)}
            />
          </div>
          <div>
            <Label>HTML Body</Label>
            <Textarea
              rows={10}
              className="font-mono text-xs"
              value={t.html_body ?? ""}
              onChange={(e) => setField("html_body", e.target.value)}
            />
          </div>
          <div>
            <Label>Text Body (optional)</Label>
            <Textarea
              rows={3}
              className="font-mono text-xs"
              value={t.text_body ?? ""}
              onChange={(e) => setField("text_body", e.target.value)}
            />
          </div>
          <div>
            <Label>Variables (comma-separated)</Label>
            <Input
              value={(Array.isArray(t.variables) ? t.variables : []).join(", ")}
              onChange={(e) =>
                setField(
                  "variables",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              placeholder="user_name, app_url, site_name"
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
              checked={t.enabled !== false}
              onCheckedChange={(v) => setField("enabled", v)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Template"}
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
    for (const v of Array.isArray(template.variables) ? template.variables : []) {
      sample[v] = `[${v}]`;
    }
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
      toast.success(`Sent test email to ${to}`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Test send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Test — {template?.name || template?.key}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Recipient Email</Label>
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
              rows={6}
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
            {sending ? "Sending…" : "Send Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
