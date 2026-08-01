import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listOrders } from "@/lib/admin.functions";
import { refundTransaction } from "@/lib/payments/checkout.functions";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { AdminPageHeader, FiltersBar, Pager, useDebounced } from "@/components/admin/table-controls";
import { toCsv, downloadCsv } from "@/lib/csv";
import { toast } from "sonner";
import { DollarSign, ShoppingBag, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/orders")({
  head: () => ({ meta: [{ title: "Orders — Admin" }, { name: "robots", content: "noindex" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const dq = useDebounced(q, 300);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [data, setData] = useState<Awaited<ReturnType<typeof listOrders>>>({
    rows: [], total: 0, revenue: { total: 0, currency: "USD" },
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBusy(true);
    listOrders({ data: { page, pageSize, q: dq, status, gateway: "" } })
      .then(setData).catch((e) => toast.error(e.message)).finally(() => setBusy(false));
  }, [dq, page, status]);
  useEffect(() => { setPage(1); }, [dq, status]);

  const [refundTarget, setRefundTarget] = useState<any>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const runRefund = useServerFn(refundTransaction);

  const submitRefund = async () => {
    if (!refundTarget) return;
    setRefundBusy(true);
    try {
      const res = await runRefund({ data: { transactionId: refundTarget.id, reason: refundReason || undefined } });
      if (res.ok) toast.success("Refund recorded");
      else toast.error(res.message ?? "Refund failed");
      setRefundTarget(null);
      setRefundReason("");
      // reload
      const fresh = await listOrders({ data: { page, pageSize, q: dq, status, gateway: "" } });
      setData(fresh);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRefundBusy(false);
    }
  };

  const exportCsv = () => {
    downloadCsv("orders.csv", toCsv(data.rows.map((r: any) => ({
      id: r.id, external_id: r.external_id, gateway: r.gateway_slug,
      amount: r.amount, currency: r.currency, status: r.status,
      user_email: r.owner?.email, created_at: r.created_at,
    }))));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <AdminPageHeader title="Orders & Payments" subtitle="Transactions across all gateways" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><DollarSign className="h-4 w-4" /> Revenue (paid)</div>
          <div className="mt-2 text-2xl font-semibold">
            {data.revenue.currency} {data.revenue.total.toFixed(2)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShoppingBag className="h-4 w-4" /> Orders</div>
          <div className="mt-2 text-2xl font-semibold">{data.total.toLocaleString()}</div>
        </Card>
      </div>

      <FiltersBar q={q} onQ={setQ} placeholder="Search by external or order ID…"
        status={status} onStatus={setStatus}
        statusOptions={[
          { label: "Pending", value: "pending" },
          { label: "Processing", value: "processing" },
          { label: "Succeeded", value: "succeeded" },
          { label: "Failed", value: "failed" },
          { label: "Refunded", value: "refunded" },
          { label: "Cancelled", value: "cancelled" },
        ]}
        onExport={exportCsv} />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busy && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!busy && data.rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No orders</TableCell></TableRow>}
            {data.rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.external_id || r.id.slice(0, 8)}</TableCell>
                <TableCell><Badge variant="outline">{r.gateway_slug}</Badge></TableCell>
                <TableCell className="text-sm">{r.owner?.email || "—"}</TableCell>
                <TableCell>{r.currency} {Number(r.amount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "succeeded" ? "default" : r.status === "failed" || r.status === "cancelled" ? "destructive" : "secondary"}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {r.status === "succeeded" && (
                    <Button size="sm" variant="outline" onClick={() => setRefundTarget(r)}>
                      <RotateCcw className="mr-1 h-3 w-3" /> Refund
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-4 py-3"><Pager page={page} pageSize={pageSize} total={data.total} onPage={setPage} /></div>
      </Card>

      <AlertDialog open={!!refundTarget} onOpenChange={(o) => !o && setRefundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund order?</AlertDialogTitle>
            <AlertDialogDescription>
              {refundTarget && (
                <>Refund <b>{refundTarget.currency} {Number(refundTarget.amount).toFixed(2)}</b> to {refundTarget.owner?.email || "customer"}. This will attempt a provider refund and record it in the logs.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason (optional, shown in refund logs)"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refundBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitRefund} disabled={refundBusy}>
              {refundBusy ? "Processing…" : "Refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
