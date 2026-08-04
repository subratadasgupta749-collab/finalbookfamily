import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getEmailSettings,
  updateEmailSettings,
  testResendConnectionFn,
  listTemplates,
  saveTemplate,
  deleteTemplate,
  sendTestEmail,
  listSubscribersFn,
  upsertSubscriberFn,
  deleteSubscriberFn,
  listCampaignsFn,
  saveCampaignFn,
  sendCampaignNowFn,
  deleteCampaignFn,
  listEmailLogsFn,
  getEmailAnalyticsFn,
} from "@/lib/email.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Mail,
  Send,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Users,
  BarChart3,
  FileText,
  Clock,
  ShieldCheck,
  RefreshCw,
  Copy,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/email-center")({
  head: () => ({
    meta: [
      { title: "Email Center — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailCenterPage,
});

const SEGMENTS = ["All Users", "Paid Users", "Free Users", "Trial Users", "Newsletter Subscribers", "Support", "Custom Segments"];

function EmailCenterPage() {
  const [activeTab, setActiveTab] = useState("settings");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Email Center</h1>
        <p className="mt-1 text-muted-foreground">
          Manage Resend email integration, transactional templates, newsletters, subscriber contacts, logs, and analytics.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="settings" className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Settings</TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> Templates</TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-1.5"><Send className="h-4 w-4" /> Campaigns</TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Contacts</TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Logs & Queue</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="settings"><ResendSettingsTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="contacts"><ContactsTab /></TabsContent>
        <TabsContent value="logs"><LogsTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ====================================================================
   TAB 1: RESEND SETTINGS
   ==================================================================== */
function ResendSettingsTab() {
  const [f, setF] = useState<any>({
    resend_enabled: true,
    api_key: "",
    sender_name: "My Family History Book",
    sender_email: "noreply@myfamilyhistorybook.com",
    reply_to_email: "support@myfamilyhistorybook.com",
    verified_domain: "myfamilyhistorybook.com",
    default_from_address: "My Family History Book <noreply@myfamilyhistorybook.com>",
    enable_transactional: true,
    enable_newsletter: true,
    enable_marketing: true,
    auto_retry: true,
    open_tracking: true,
    click_tracking: true,
    rate_limit_per_min: 600,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getEmailSettings();
      if (data) setF((prev: any) => ({ ...prev, ...data, api_key: "" }));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmailSettings({
        data: {
          resend_enabled: f.resend_enabled,
          api_key: f.api_key ? f.api_key : undefined,
          sender_name: f.sender_name,
          sender_email: f.sender_email,
          reply_to_email: f.reply_to_email,
          verified_domain: f.verified_domain,
          default_from_address: f.default_from_address,
          enable_transactional: f.enable_transactional,
          enable_newsletter: f.enable_newsletter,
          enable_marketing: f.enable_marketing,
          auto_retry: f.auto_retry,
          open_tracking: f.open_tracking,
          click_tracking: f.click_tracking,
          rate_limit_per_min: Number(f.rate_limit_per_min) || 600,
        },
      });
      toast.success("Resend email settings saved");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await testResendConnectionFn({ data: { recipient: testRecipient || undefined } });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Test failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading settings…</div>;

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Resend Provider Integration
            {f.connection_status === "ok" && <Badge className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Active & Verified</Badge>}
            {f.connection_status === "error" && <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" /> Connection Error</Badge>}
            {f.has_api_key ? <Badge variant="outline">API Key Configured</Badge> : <Badge variant="destructive">No API Key</Badge>}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure Resend API credentials, sender identities, tracking policies, and rate limits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={f.resend_enabled} onCheckedChange={(v) => setF({ ...f, resend_enabled: v })} />
          <Label className="text-sm font-medium">{f.resend_enabled ? "Resend Enabled" : "Resend Disabled"}</Label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={f.has_api_key ? "Replace Resend API Key (leave blank to keep current)" : "Resend API Key"}>
          <Input
            type="password"
            value={f.api_key}
            onChange={(e) => setF({ ...f, api_key: e.target.value })}
            placeholder="re_123456789..."
            autoComplete="off"
          />
        </Field>

        <Field label="Sender Name">
          <Input value={f.sender_name ?? ""} onChange={(e) => setF({ ...f, sender_name: e.target.value })} placeholder="My Family History Book" />
        </Field>

        <Field label="Sender Email Address">
          <Input value={f.sender_email ?? ""} onChange={(e) => setF({ ...f, sender_email: e.target.value })} placeholder="noreply@myfamilyhistorybook.com" />
        </Field>

        <Field label="Reply-To Email Address">
          <Input value={f.reply_to_email ?? ""} onChange={(e) => setF({ ...f, reply_to_email: e.target.value })} placeholder="support@myfamilyhistorybook.com" />
        </Field>

        <Field label="Verified Domain">
          <Input value={f.verified_domain ?? ""} onChange={(e) => setF({ ...f, verified_domain: e.target.value })} placeholder="myfamilyhistorybook.com" />
        </Field>

        <Field label="Default From Header Address">
          <Input value={f.default_from_address ?? ""} onChange={(e) => setF({ ...f, default_from_address: e.target.value })} placeholder="My Family History Book <noreply@myfamilyhistorybook.com>" />
        </Field>
      </div>

      <div className="border-t pt-4 grid gap-4 md:grid-cols-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div><Label className="text-xs font-medium">Transactional Emails</Label><p className="text-[11px] text-muted-foreground">OTP, Password Reset, Receipts</p></div>
          <Switch checked={f.enable_transactional} onCheckedChange={(v) => setF({ ...f, enable_transactional: v })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div><Label className="text-xs font-medium">Newsletter Campaigns</Label><p className="text-[11px] text-muted-foreground">Subscribers, Broadcasts</p></div>
          <Switch checked={f.enable_newsletter} onCheckedChange={(v) => setF({ ...f, enable_newsletter: v })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div><Label className="text-xs font-medium">Marketing & Offers</Label><p className="text-[11px] text-muted-foreground">Promotions, Trial Reminders</p></div>
          <Switch checked={f.enable_marketing} onCheckedChange={(v) => setF({ ...f, enable_marketing: v })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div><Label className="text-xs font-medium">Open Tracking</Label><p className="text-[11px] text-muted-foreground">Track email reads</p></div>
          <Switch checked={f.open_tracking} onCheckedChange={(v) => setF({ ...f, open_tracking: v })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div><Label className="text-xs font-medium">Click Tracking</Label><p className="text-[11px] text-muted-foreground">Track link clicks</p></div>
          <Switch checked={f.click_tracking} onCheckedChange={(v) => setF({ ...f, click_tracking: v })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div><Label className="text-xs font-medium">Auto Retry Worker</Label><p className="text-[11px] text-muted-foreground">Retry failed sends</p></div>
          <Switch checked={f.auto_retry} onCheckedChange={(v) => setF({ ...f, auto_retry: v })} />
        </div>
      </div>

      <div className="border-t pt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            type="email"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder="Optional test recipient email..."
            className="text-xs"
          />
          <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={testing || (!f.has_api_key && !f.api_key)}>
            <Zap className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            {testing ? "Testing Resend…" : "Test Connection"}
          </Button>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving Settings…" : "Save Resend Settings"}
        </Button>
      </div>

      {f.last_test_message && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded border">
          <strong>Last Test Status:</strong> {f.last_test_message} {f.last_tested_at && `(${new Date(f.last_tested_at).toLocaleString()})`}
        </div>
      )}
    </Card>
  );
}

/* ====================================================================
   TAB 2: TEMPLATES
   ==================================================================== */
function TemplatesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [testing, setTesting] = useState<any | null>(null);

  const refresh = async () => {
    setLoading(true);
    try { setRows(await listTemplates() as any[]); }
    catch (e: any) { toast.error(e?.message ?? "Failed to load templates"); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Email Templates</h2>
          <p className="text-xs text-muted-foreground">Manage dynamic transactional and marketing templates with double-curly variable interpolation.</p>
        </div>
        <Button onClick={() => setEditing({ key: "", name: "", category: "transactional", subject: "", html_body: "", variables: ["user_name", "app_url"], enabled: true })}>
          <Plus className="mr-2 h-4 w-4" /> New Template
        </Button>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading templates…</div> : (
        <div className="grid gap-3">
          {rows.map((t) => (
            <Card key={t.id} className="p-4 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline" className="font-mono text-xs">{t.key}</Badge>
                  <Badge variant="secondary">{t.category}</Badge>
                  {!t.enabled && <Badge variant="destructive">Disabled</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{t.description || t.subject}</p>
                {t.variables?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.variables.map((v: string) => (
                      <code key={v} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{`{{${v}}}`}</code>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setTesting(t)}><Send className="mr-1 h-3 w-3" /> Test</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(t)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm(`Delete template "${t.name}"?`)) return;
                  try { await deleteTemplate({ data: { id: t.id } }); toast.success("Deleted"); refresh(); }
                  catch (e: any) { toast.error(e?.message); }
                }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && <TemplateEditorDialog template={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {testing && <TestTemplateDialog template={testing} onClose={() => setTesting(null)} />}
    </div>
  );
}

function TemplateEditorDialog({ template, onClose, onSaved }: { template: any; onClose: () => void; onSaved: () => void }) {
  const [t, setT] = useState<any>(template);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await saveTemplate({ data: t });
      toast.success("Template saved");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t.id ? "Edit Template" : "New Template"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Key (slug)"><Input value={t.key} onChange={(e) => setT({ ...t, key: e.target.value })} placeholder="welcome" disabled={!!t.id} /></Field>
            <Field label="Name"><Input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="Welcome Email" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={t.category} onValueChange={(v) => setT({ ...t, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transactional">transactional</SelectItem>
                  <SelectItem value="marketing">marketing</SelectItem>
                  <SelectItem value="newsletter">newsletter</SelectItem>
                  <SelectItem value="system">system</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Subject Line"><Input value={t.subject} onChange={(e) => setT({ ...t, subject: e.target.value })} /></Field>
          </div>
          <Field label="Description"><Input value={t.description ?? ""} onChange={(e) => setT({ ...t, description: e.target.value })} /></Field>
          <Field label="HTML Body">
            <Textarea rows={10} className="font-mono text-xs" value={t.html_body} onChange={(e) => setT({ ...t, html_body: e.target.value })} />
          </Field>
          <Field label="Text Body (Optional)">
            <Textarea rows={3} className="font-mono text-xs" value={t.text_body ?? ""} onChange={(e) => setT({ ...t, text_body: e.target.value })} />
          </Field>
          <Field label="Variables (comma separated)">
            <Input
              value={(t.variables ?? []).join(", ")}
              onChange={(e) => setT({ ...t, variables: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
          <div className="flex items-center justify-between rounded border p-3">
            <Label className="text-xs font-medium">Enabled</Label>
            <Switch checked={!!t.enabled} onCheckedChange={(v) => setT({ ...t, enabled: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Template"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestTemplateDialog({ template, onClose }: { template: any; onClose: () => void }) {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await sendTestEmail({ data: { templateKey: template.key, to, variables: { user_name: "Test User" } } });
      toast.success(`Sent test email to ${to}`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send Test — {template.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Recipient Email">
            <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="your-email@example.com" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending || !to}>{sending ? "Sending…" : "Send Test"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ====================================================================
   TAB 3: CAMPAIGNS
   ==================================================================== */
function CampaignsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const refresh = async () => {
    setLoading(true);
    try { setRows(await listCampaignsFn() as any[]); }
    catch (e: any) { toast.error(e?.message ?? "Failed to load campaigns"); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Newsletter Campaigns</h2>
          <p className="text-xs text-muted-foreground">Create, schedule, broadcast, and track newsletter campaigns.</p>
        </div>
        <Button onClick={() => setEditing({ title: "", subject: "", content_html: "<h1>Hello {{user_name}}</h1><p>Our monthly update is here!</p>", segment: "All Users", status: "draft" })}>
          <Plus className="mr-2 h-4 w-4" /> Create Campaign
        </Button>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading campaigns…</div> : (
        <div className="grid gap-3">
          {rows.map((c) => (
            <Card key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-base">{c.title}</span>
                  <Badge variant={c.status === "sent" ? "default" : c.status === "sending" ? "secondary" : "outline"}>{c.status}</Badge>
                  <Badge variant="outline">{c.segment}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Subject: {c.subject}</p>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>Sent: <strong>{c.stats_sent}</strong></span>
                  <span>Opened: <strong>{c.stats_opened}</strong></span>
                  <span>Clicked: <strong>{c.stats_clicked}</strong></span>
                  {c.sent_at && <span>Sent At: {new Date(c.sent_at).toLocaleString()}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {c.status === "draft" && (
                  <Button size="sm" onClick={async () => {
                    if (!confirm(`Broadcast campaign "${c.title}" to ${c.segment}?`)) return;
                    try {
                      const res = await sendCampaignNowFn({ data: { campaignId: c.id } });
                      toast.success(`Broadcast started to ${res.sentCount} recipients`);
                      refresh();
                    } catch (e: any) { toast.error(e?.message); }
                  }}>
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Send Now
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm(`Delete campaign "${c.title}"?`)) return;
                  try { await deleteCampaignFn({ data: { id: c.id } }); toast.success("Deleted"); refresh(); }
                  catch (e: any) { toast.error(e?.message); }
                }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No campaigns created yet.</Card>}
        </div>
      )}

      {editing && (
        <CampaignDialog
          campaign={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function CampaignDialog({ campaign, onClose, onSaved }: { campaign: any; onClose: () => void; onSaved: () => void }) {
  const [c, setC] = useState<any>(campaign);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await saveCampaignFn({ data: c });
      toast.success("Campaign saved");
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{c.id ? "Edit Campaign" : "New Campaign"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label="Campaign Internal Title"><Input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} placeholder="August Newsletter #1" /></Field>
          <Field label="Email Subject Line"><Input value={c.subject} onChange={(e) => setC({ ...c, subject: e.target.value })} placeholder="Exclusive Family Story Tips" /></Field>
          <Field label="Target Segment">
            <Select value={c.segment} onValueChange={(v) => setC({ ...c, segment: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Campaign HTML Content">
            <Textarea rows={10} className="font-mono text-xs" value={c.content_html} onChange={(e) => setC({ ...c, content_html: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Campaign"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ====================================================================
   TAB 4: CONTACTS
   ==================================================================== */
function ContactsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const refresh = async () => {
    setLoading(true);
    try { setRows(await listSubscribersFn() as any[]); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Subscriber Contacts</h2>
          <p className="text-xs text-muted-foreground">Manage subscriber contacts, segments, and subscription statuses.</p>
        </div>
        <Button onClick={() => setEditing({ email: "", name: "", status: "subscribed", segment: "Newsletter Subscribers" })}>
          <Plus className="mr-2 h-4 w-4" /> Add Subscriber
        </Button>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading subscribers…</div> : (
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b font-medium text-muted-foreground">
                <th className="p-2">Email</th>
                <th className="p-2">Name</th>
                <th className="p-2">Segment</th>
                <th className="p-2">Status</th>
                <th className="p-2">Subscribed At</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-2 font-mono">{s.email}</td>
                  <td className="p-2">{s.name || "—"}</td>
                  <td className="p-2"><Badge variant="outline">{s.segment}</Badge></td>
                  <td className="p-2">
                    <Badge variant={s.status === "subscribed" ? "default" : "secondary"}>{s.status}</Badge>
                  </td>
                  <td className="p-2 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm(`Delete ${s.email}?`)) return;
                      try { await deleteSubscriberFn({ data: { id: s.id } }); refresh(); }
                      catch (e: any) { toast.error(e?.message); }
                    }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {editing && (
        <SubscriberDialog
          subscriber={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function SubscriberDialog({ subscriber, onClose, onSaved }: { subscriber: any; onClose: () => void; onSaved: () => void }) {
  const [s, setS] = useState<any>(subscriber);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await upsertSubscriberFn({ data: s });
      toast.success("Subscriber saved");
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{s.id ? "Edit Subscriber" : "Add Subscriber"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Email Address"><Input type="email" value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} /></Field>
          <Field label="Full Name"><Input value={s.name ?? ""} onChange={(e) => setS({ ...s, name: e.target.value })} /></Field>
          <Field label="Segment">
            <Select value={s.segment} onValueChange={(v) => setS({ ...s, segment: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SEGMENTS.map((seg) => <SelectItem key={seg} value={seg}>{seg}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={s.status} onValueChange={(v) => setS({ ...s, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="subscribed">subscribed</SelectItem>
                <SelectItem value="unsubscribed">unsubscribed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Contact"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ====================================================================
   TAB 5: LOGS & QUEUE
   ==================================================================== */
function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await listEmailLogsFn({ data: { page: 1, pageSize: 50 } });
      setLogs(res.rows);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Email Delivery Logs & Queue</h2>
          <p className="text-xs text-muted-foreground">Monitor real-time Resend dispatch logs, recipient statuses, and queue items.</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh</Button>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading logs…</div> : (
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b font-medium text-muted-foreground">
                <th className="p-2">Time</th>
                <th className="p-2">Recipient</th>
                <th className="p-2">Template</th>
                <th className="p-2">Subject</th>
                <th className="p-2">Status</th>
                <th className="p-2">Resend ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-2 text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-2 font-mono">{l.to_email}</td>
                  <td className="p-2"><Badge variant="outline">{l.template_key || "custom"}</Badge></td>
                  <td className="p-2 max-w-xs truncate">{l.subject}</td>
                  <td className="p-2">
                    <Badge variant={l.status === "failed" ? "destructive" : "default"}>{l.status}</Badge>
                  </td>
                  <td className="p-2 font-mono text-[11px] text-muted-foreground">{l.resend_id || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No email logs recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ====================================================================
   TAB 6: ANALYTICS
   ==================================================================== */
function AnalyticsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmailAnalyticsFn()
      .then(setStats)
      .catch((e) => toast.error(e?.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Loading analytics…</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total Emails Sent</div>
          <div className="text-2xl font-bold mt-1">{stats?.totalSent ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Delivered</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats?.delivered ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Open Rate</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats?.openRate ?? 0}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Click Rate</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{stats?.clickRate ?? 0}%</div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Bounce Rate</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats?.bounceRate ?? 0}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Active Subscribers</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats?.activeSubscribers ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Unsubscribes</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{stats?.unsubscribes ?? 0}</div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
