import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Plug, Settings2, Trash2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listGateways,
  upsertGateway,
  toggleGateway,
  deleteGateway,
  testGatewayConnection,
  listWebhookLogs,
  listTransactions,
  listRegisteredAdapters,
  type AdminGateway,
} from "@/lib/payments/gateways.functions";

export const Route = createFileRoute("/_authenticated/_admin/admin/payment-gateways")({
  head: () => ({
    meta: [
      { title: "Payment Gateways — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentGatewaysPage,
});

function PaymentGatewaysPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.local";
  const qc = useQueryClient();
  const listFn = useServerFn(listGateways);
  const adaptersFn = useServerFn(listRegisteredAdapters);

  const { data: gateways = [], isLoading } = useQuery({
    queryKey: ["payment_gateways"],
    queryFn: () => listFn({ data: { origin } }),
  });
  const { data: adapters = [] } = useQuery({
    queryKey: ["payment_adapters"],
    queryFn: () => adaptersFn(),
  });

  const [editing, setEditing] = useState<AdminGateway | null>(null);
  const [creating, setCreating] = useState<null | { slug: string; name: string }>(null);
  const [tab, setTab] = useState<"gateways" | "webhooks" | "transactions">("gateways");

  const toggleFn = useServerFn(toggleGateway);
  const toggleMut = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => toggleFn({ data: v }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["payment_gateways"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testFn = useServerFn(testGatewayConnection);
  const testMut = useMutation({
    mutationFn: (id: string) => testFn({ data: { id } }),
    onSuccess: (r) => (r.ok ? toast.success("Connection OK") : toast.error(r.message ?? "Failed")),
    onError: (e: Error) => toast.error(e.message),
  });

  const delFn = useServerFn(deleteGateway);
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["payment_gateways"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unregistered = useMemo(
    () => adapters.filter((a) => !gateways.some((g) => g.slug === a.slug)),
    [adapters, gateways],
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Payment gateways</h1>
          <p className="mt-2 text-muted-foreground">
            Enable, configure, and monitor every gateway from one place. Credentials are
            encrypted at rest and never exposed to the frontend.
          </p>
        </div>
        {unregistered.length > 0 && (
          <Select
            onValueChange={(slug) => {
              const a = unregistered.find((x) => x.slug === slug);
              if (a) setCreating({ slug: a.slug, name: a.name });
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder={<><Plus className="mr-2 inline h-4 w-4" /> Add a gateway</>} />
            </SelectTrigger>
            <SelectContent>
              {unregistered.map((a) => (
                <SelectItem key={a.slug} value={a.slug}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-6">
        <TabsList>
          <TabsTrigger value="gateways">Gateways</TabsTrigger>
          <TabsTrigger value="webhooks">Webhook logs</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="gateways" className="mt-6">
          {isLoading ? (
            <div className="text-muted-foreground">Loading gateways…</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {gateways.map((g) => (
                <GatewayCard
                  key={g.id}
                  gateway={g}
                  onEdit={() => setEditing(g)}
                  onToggle={(enabled) => toggleMut.mutate({ id: g.id, enabled })}
                  onTest={() => testMut.mutate(g.id)}
                  onDelete={() => {
                    if (confirm(`Delete ${g.name}? This cannot be undone.`)) delMut.mutate(g.id);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <WebhookLogsPanel />
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <TransactionsPanel />
        </TabsContent>
      </Tabs>

      {editing && (
        <GatewayEditor
          gateway={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["payment_gateways"] });
          }}
        />
      )}
      {creating && (
        <GatewayEditor
          gateway={
            {
              id: "",
              slug: creating.slug,
              name: creating.name,
              description: null,
              logo_url: null,
              enabled: false,
              mode: "sandbox",
              currency: "USD",
              country_restriction: [],
              success_url: null,
              cancel_url: null,
              payment_instructions: null,
              display_order: gateways.length + 1,
              status: "active",
              webhook_verified: false,
              last_webhook_at: null,
              updated_at: new Date().toISOString(),
              webhook_url: `${origin}/api/public/webhooks/${creating.slug}`,
              has_webhook_secret: false,
              credentials_masked: {},
              required_fields: adapters.find((a) => a.slug === creating.slug)?.requiredFields ?? [],
              optional_fields: adapters.find((a) => a.slug === creating.slug)?.optionalFields ?? [],
              supports_hosted_checkout: false,
            } as AdminGateway
          }
          isNew
          onClose={() => setCreating(null)}
          onSaved={() => {
            setCreating(null);
            qc.invalidateQueries({ queryKey: ["payment_gateways"] });
          }}
        />
      )}
    </div>
  );
}

function GatewayCard({
  gateway,
  onEdit,
  onToggle,
  onTest,
  onDelete,
}: {
  gateway: AdminGateway;
  onEdit: () => void;
  onToggle: (v: boolean) => void;
  onTest: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {gateway.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gateway.logo_url}
              alt={gateway.name}
              className="h-10 w-10 rounded-md object-contain"
            />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
              {gateway.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-semibold">{gateway.name}</div>
            <div className="text-xs text-muted-foreground">
              {gateway.slug} · {gateway.mode}
            </div>
          </div>
        </div>
        <Switch checked={gateway.enabled} onCheckedChange={onToggle} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Badge variant={gateway.enabled ? "default" : "secondary"}>
          {gateway.enabled ? "Enabled" : "Disabled"}
        </Badge>
        <Badge variant="outline">{gateway.currency}</Badge>
        {gateway.webhook_verified && <Badge variant="outline">Webhook ✓</Badge>}
        {gateway.last_webhook_at && (
          <Badge variant="outline">
            Last hook {new Date(gateway.last_webhook_at).toLocaleDateString()}
          </Badge>
        )}
      </div>

      <div className="mt-4 rounded-md border border-dashed border-border/70 bg-muted/30 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Webhook URL</span>
          <CopyButton value={gateway.webhook_url} />
        </div>
        <code className="block truncate text-xs">{gateway.webhook_url}</code>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Configure
        </Button>
        <Button size="sm" variant="outline" onClick={onTest}>
          <Plug className="mr-1.5 h-3.5 w-3.5" /> Test
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function GatewayEditor({
  gateway,
  isNew,
  onClose,
  onSaved,
}: {
  gateway: AdminGateway;
  isNew?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    slug: gateway.slug,
    name: gateway.name,
    description: gateway.description ?? "",
    logo_url: gateway.logo_url ?? "",
    enabled: gateway.enabled,
    mode: gateway.mode,
    currency: gateway.currency,
    country_restriction: (gateway.country_restriction ?? []).join(","),
    success_url: gateway.success_url ?? "",
    cancel_url: gateway.cancel_url ?? "",
    payment_instructions: gateway.payment_instructions ?? "",
    display_order: gateway.display_order,
    status: gateway.status,
    api_key: "",
    secret_key: "",
    client_id: "",
    client_secret: "",
    merchant_email: "",
    store_id: "",
    webhook_secret: "",
  });

  const upsertFn = useServerFn(upsertGateway);
  const mut = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          id: isNew ? undefined : gateway.id,
          slug: form.slug,
          name: form.name,
          description: form.description || null,
          logo_url: form.logo_url || null,
          enabled: form.enabled,
          mode: form.mode,
          currency: form.currency,
          country_restriction: form.country_restriction
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean),
          success_url: form.success_url || null,
          cancel_url: form.cancel_url || null,
          payment_instructions: form.payment_instructions || null,
          display_order: form.display_order,
          status: form.status,
          credentials: {
            api_key: form.api_key,
            secret_key: form.secret_key,
            client_id: form.client_id,
            client_secret: form.client_secret,
            merchant_email: form.merchant_email,
            store_id: form.store_id,
          },
          webhook_secret: form.webhook_secret,
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fieldLabel: Record<string, string> = {
    api_key: "API key",
    secret_key: "Secret key",
    client_id: "Client ID",
    client_secret: "Client secret",
    merchant_email: "Merchant email",
    store_id: "Store ID",
  };

  const credentialFields = Array.from(
    new Set([...(gateway.required_fields ?? []), ...(gateway.optional_fields ?? []), "api_key", "secret_key", "client_id", "client_secret", "merchant_email", "store_id"]),
  );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? `Add ${gateway.name}` : `Configure ${gateway.name}`}</DialogTitle>
          <DialogDescription>
            All credentials are encrypted and stored server-side. Leave a credential field blank
            to keep the existing value.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Slug">
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                disabled={!isNew}
              />
            </Field>
            <Field label="Currency">
              <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </Field>
            <Field label="Mode">
              <Select
                value={form.mode}
                onValueChange={(v) => setForm({ ...form, mode: v as "sandbox" | "live" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Display order">
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
              />
            </Field>
            <Field label="Status">
              <Input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
            </Field>
            <Field label="Logo URL">
              <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
            </Field>
            <Field label="Country restriction (comma-separated ISO codes)">
              <Input
                placeholder="US,GB,DE"
                value={form.country_restriction}
                onChange={(e) => setForm({ ...form, country_restriction: e.target.value })}
              />
            </Field>
            <Field label="Success URL">
              <Input
                placeholder="https://…/payment/success"
                value={form.success_url}
                onChange={(e) => setForm({ ...form, success_url: e.target.value })}
              />
            </Field>
            <Field label="Cancel URL">
              <Input
                placeholder="https://…/payment/cancel"
                value={form.cancel_url}
                onChange={(e) => setForm({ ...form, cancel_url: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </Field>

          <Field label="Payment instructions (for manual gateways)">
            <Textarea
              value={form.payment_instructions}
              onChange={(e) => setForm({ ...form, payment_instructions: e.target.value })}
              rows={3}
            />
          </Field>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">Credentials</div>
                <div className="text-xs text-muted-foreground">
                  Required for this gateway:{" "}
                  {(gateway.required_fields ?? []).map((f) => fieldLabel[f] ?? f).join(", ") || "—"}
                </div>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {credentialFields.map((f) => (
                <Field
                  key={f}
                  label={
                    <span>
                      {fieldLabel[f] ?? f}{" "}
                      {gateway.credentials_masked[f] && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (current: {gateway.credentials_masked[f]})
                        </span>
                      )}
                    </span>
                  }
                >
                  <Input
                    type="password"
                    autoComplete="off"
                    placeholder={
                      gateway.credentials_masked[f]
                        ? "Leave blank to keep existing"
                        : "Enter value"
                    }
                    value={(form as any)[f]}
                    onChange={(e) => setForm({ ...form, [f]: e.target.value } as any)}
                  />
                </Field>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold">Webhook</div>
              <Badge variant={gateway.webhook_verified ? "default" : "secondary"}>
                {gateway.webhook_verified ? "Verified" : "Not yet verified"}
              </Badge>
            </div>
            <div className="mb-3 flex items-center gap-2 rounded-md border bg-background p-2">
              <code className="flex-1 truncate text-xs">{gateway.webhook_url}</code>
              <CopyButton value={gateway.webhook_url} />
            </div>
            <Field
              label={
                <span>
                  Webhook secret{" "}
                  {gateway.has_webhook_secret && (
                    <span className="text-xs text-muted-foreground">(currently set — leave blank to keep)</span>
                  )}
                </span>
              }
            >
              <Input
                type="password"
                autoComplete="off"
                value={form.webhook_secret}
                onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })}
                placeholder={gateway.has_webhook_secret ? "•••••••• (unchanged)" : "Paste signing secret"}
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Saving…" : "Save gateway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
    </div>
  );
}

function WebhookLogsPanel() {
  const fn = useServerFn(listWebhookLogs);
  const { data = [], refetch, isFetching } = useQuery({
    queryKey: ["webhook_logs"],
    queryFn: () => fn({ data: {} }),
  });
  return (
    <div className="rounded-2xl border border-border/60 bg-background">
      <div className="flex items-center justify-between border-b border-border/60 p-4">
        <div>
          <div className="font-semibold">Recent webhooks</div>
          <div className="text-xs text-muted-foreground">Latest 50 deliveries across all gateways.</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>
      <div className="divide-y divide-border/60">
        {data.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No webhooks received yet.</div>
        )}
        {data.map((row: any) => (
          <div key={row.id} className="p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{row.gateway_slug}</Badge>
              <span className="font-medium">{row.event_type ?? "unknown"}</span>
              <Badge variant={row.verified ? "default" : "destructive"}>
                {row.verified ? "verified" : "unverified"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(row.received_at).toLocaleString()}
              </span>
            </div>
            {row.error && <div className="mt-1 text-xs text-destructive">{row.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionsPanel() {
  const fn = useServerFn(listTransactions);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");

  const { data = [], refetch } = useQuery({
    queryKey: ["transactions", search, status],
    queryFn: () => fn({ data: { search: search || undefined, status: status || undefined } }),
  });

  function exportCsv() {
    const header = ["id", "gateway_slug", "amount", "currency", "status", "external_id", "created_at"];
    const rows = data.map((r: any) =>
      [r.id, r.gateway_slug, r.amount, r.currency, r.status, r.external_id ?? "", r.created_at].join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-4">
        <Input
          placeholder="Search external id or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="succeeded">Succeeded</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Refresh</Button>
        <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Gateway</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">External ID</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No transactions yet.
                </td>
              </tr>
            )}
            {data.map((r: any) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3"><Badge variant="outline">{r.gateway_slug}</Badge></td>
                <td className="p-3">{r.amount} {r.currency}</td>
                <td className="p-3"><Badge>{r.status}</Badge></td>
                <td className="p-3"><code className="text-xs">{r.external_id ?? "—"}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
