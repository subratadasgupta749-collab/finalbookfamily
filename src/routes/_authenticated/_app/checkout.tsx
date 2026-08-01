import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { listCheckoutGateways } from "@/lib/payments/checkout.functions";
import { initiateCheckout } from "@/lib/payments/gateways.functions";
import { previewCoupon } from "@/lib/coupons.functions";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Loader2, Lock, ShieldCheck, Tag, X } from "lucide-react";

const searchSchema = z.object({
  bookId: z.string().optional(),
  amount: z.coerce.number().positive().optional(),
});

export const Route = createFileRoute("/_authenticated/_app/checkout")({
  head: () => ({ meta: [{ title: "Checkout — My Family History Book" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { bookId, amount: overrideAmount } = Route.useSearch();
  const settings = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  const price = overrideAmount ?? Number((settings as any)?.pricing?.book_price ?? 34);
  const currency = String((settings as any)?.pricing?.currency ?? "USD");

  const fetchGateways = useServerFn(listCheckoutGateways);
  const startCheckout = useServerFn(initiateCheckout);

  const { data: gateways = [], isLoading } = useQuery({
    queryKey: ["checkout-gateways"],
    queryFn: () => fetchGateways(),
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; final: number } | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const runPreviewCoupon = useServerFn(previewCoupon);

  const chosen = useMemo(
    () => gateways.find((g: any) => g.id === selected) ?? gateways[0],
    [gateways, selected],
  );

  const total = applied ? applied.final : price;

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    try {
      const res = await runPreviewCoupon({ data: { code: couponInput, amount: price } });
      if (!res.ok) {
        toast.error(res.reason ?? "Invalid coupon");
        return;
      }
      setApplied({ code: res.code!, discount: res.discount!, final: res.final! });
      toast.success(`Coupon "${res.code}" applied`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCheckingCoupon(false);
    }
  };

  const pay = async () => {
    if (!chosen) return;
    setBusy(true);
    try {
      const res = await startCheckout({
        data: {
          gatewayId: chosen.id,
          amount: price,
          currency,
          description: "My Family History Book — Premium Memoir",
          customerEmail: user?.email ?? undefined,
          origin: window.location.origin,
          metadata: bookId ? { book_id: bookId } : undefined,
          couponCode: applied?.code,
        },
      });
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else {
        navigate({
          to: "/checkout/success",
          search: { txId: res.transactionId },
        });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Complete your purchase</h1>
        <p className="text-sm text-muted-foreground">Secure checkout · You're one step from your finished book.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Card className="p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payment method</h2>
            <p className="text-xs text-muted-foreground">Choose how you'd like to pay.</p>
          </div>

          {isLoading && <div className="text-sm text-muted-foreground">Loading payment methods…</div>}
          {!isLoading && gateways.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No payment methods are enabled yet. Please contact support.
            </div>
          )}

          <div className="space-y-3">
            {gateways.map((g: any) => {
              const active = chosen?.id === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelected(g.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    active ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {g.logo_url ? (
                      <img src={g.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
                    ) : (
                      <div className="grid h-8 w-8 place-items-center rounded bg-primary/10 text-primary">
                        <CreditCard className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        {g.name}
                        {g.mode === "sandbox" && <Badge variant="secondary" className="text-[10px]">Test mode</Badge>}
                      </div>
                      {g.description && <div className="text-xs text-muted-foreground">{g.description}</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {chosen?.payment_instructions && (
            <div className="rounded-lg bg-muted/40 p-4 text-sm">
              <div className="mb-1 font-medium">Payment instructions</div>
              <p className="whitespace-pre-wrap text-muted-foreground">{chosen.payment_instructions}</p>
            </div>
          )}

          <Button size="lg" className="w-full" onClick={pay} disabled={busy || !chosen}>
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting…</> : (
              <><Lock className="mr-2 h-4 w-4" /> Pay {currency} {total.toFixed(2)}</>
            )}
          </Button>
        </Card>

        <Card className="p-6 h-fit space-y-4">
          <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Order summary</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>The Family History Book</span>
              <span>{currency} {price.toFixed(2)}</span>
            </div>
            {applied && (
              <div className="flex justify-between text-primary">
                <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {applied.code}</span>
                <span>− {currency} {applied.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>{currency} {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coupon code</div>
            {applied ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">{applied.code}</span>
                <button
                  type="button"
                  onClick={() => { setApplied(null); setCouponInput(""); }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove coupon"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyCoupon}
                  disabled={checkingCoupon || !couponInput.trim()}
                >
                  {checkingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>30-day happiness guarantee. Encrypted, PCI-compliant checkout.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
