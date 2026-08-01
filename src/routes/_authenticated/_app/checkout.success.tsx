import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { getMyTransaction } from "@/lib/payments/checkout.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/checkout/success")({
  head: () => ({ meta: [{ title: "Order confirmed" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s) => z.object({ txId: z.string().uuid().optional() }).parse(s),
  component: SuccessPage,
});

function SuccessPage() {
  const { txId } = Route.useSearch();
  const fetchTx = useServerFn(getMyTransaction);
  const { data: tx, isLoading } = useQuery({
    queryKey: ["my-tx", txId],
    queryFn: () => (txId ? fetchTx({ data: { id: txId } }) : Promise.resolve(null)),
    enabled: !!txId,
    refetchInterval: (q) => (q.state.data?.status === "processing" || q.state.data?.status === "pending" ? 2500 : false),
  });

  return (
    <div className="mx-auto max-w-xl py-12">
      <Card className="p-10 text-center space-y-5">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          {tx?.status === "succeeded" ? <CheckCircle2 className="h-8 w-8" /> : <Loader2 className="h-8 w-8 animate-spin" />}
        </div>
        <h1 className="font-serif text-3xl">
          {tx?.status === "succeeded" ? "Payment received" : "Confirming your payment…"}
        </h1>
        <p className="text-muted-foreground">
          {tx?.status === "succeeded"
            ? "Thank you! Your order is confirmed and a receipt is on its way to your inbox."
            : isLoading
              ? "Loading your order details…"
              : "This usually completes within a few seconds. You can safely leave this page — we'll email you once it's confirmed."}
        </p>
        {tx && (
          <div className="rounded-lg border p-4 text-left text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span className="font-mono">{tx.id.slice(0, 8)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span>{tx.currency} {Number(tx.amount).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge>{tx.status}</Badge></div>
          </div>
        )}
        <Button asChild size="lg" className="w-full"><Link to="/dashboard">Go to dashboard</Link></Button>
      </Card>
    </div>
  );
}
