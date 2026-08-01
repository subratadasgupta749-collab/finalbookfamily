import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyOrders, getMyOrderDownloads } from "@/lib/orders.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Receipt } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/_app/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — My Family History Book" },
      { name: "description", content: "Your purchase history and book downloads." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

function statusColor(s: string) {
  switch (s) {
    case "succeeded": return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
    case "refunded": return "bg-amber-500/10 text-amber-700 border-amber-200";
    case "failed":
    case "cancelled": return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function OrdersPage() {
  const fetchOrders = useServerFn(listMyOrders);
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => fetchOrders(),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">My Orders</h1>
        <p className="text-sm text-muted-foreground">Your purchase history, invoices, and book downloads.</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center">
          <Receipt className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <div className="font-medium">No orders yet</div>
          <div className="mt-1 text-sm text-muted-foreground">Your purchases will appear here.</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);
  const bookId = (order.metadata as any)?.book_id as string | undefined;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium">{order.description ?? "The Family History Book"}</div>
            <Badge variant="outline" className={`text-[10px] ${statusColor(order.status)}`}>
              {order.status}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            #{order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString()} · via {order.gateway_slug}
          </div>
          {order.coupon_code && (
            <div className="mt-1 text-xs text-primary">Coupon {order.coupon_code} · −{order.currency} {Number(order.discount_amount ?? 0).toFixed(2)}</div>
          )}
        </div>
        <div className="text-right">
          <div className="font-semibold">{order.currency} {Number(order.amount).toFixed(2)}</div>
          {order.status === "succeeded" && bookId && (
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setExpanded((x) => !x)}>
              <Download className="mr-2 h-3.5 w-3.5" />
              {expanded ? "Hide downloads" : "Downloads"}
            </Button>
          )}
        </div>
      </div>
      {expanded && bookId && <Downloads bookId={bookId} />}
    </Card>
  );
}

function Downloads({ bookId }: { bookId: string }) {
  const fetchDownloads = useServerFn(getMyOrderDownloads);
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["order-downloads", bookId],
    queryFn: () => fetchDownloads({ data: { bookId } }),
  });
  if (isLoading) return <div className="mt-4 text-xs text-muted-foreground">Loading downloads…</div>;
  if (files.length === 0) return <div className="mt-4 text-xs text-muted-foreground">No files generated yet.</div>;
  return (
    <div className="mt-4 space-y-2 border-t pt-4">
      {files.map((f: any) => (
        <a
          key={f.id}
          href={f.url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
        >
          <span className="flex items-center gap-2">
            <Download className="h-3.5 w-3.5" />
            {f.filename}
          </span>
          <span className="text-xs text-muted-foreground">{f.kind.toUpperCase()}</span>
        </a>
      ))}
    </div>
  );
}
