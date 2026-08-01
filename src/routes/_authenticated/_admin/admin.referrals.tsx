import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListReferrals, markReferralRewarded } from "@/lib/referrals.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gift } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/referrals")({
  head: () => ({ meta: [{ title: "Referrals — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ReferralsAdmin,
});

function statusColor(s: string) {
  switch (s) {
    case "purchased": return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
    case "rewarded": return "bg-primary/10 text-primary border-primary/20";
    case "signed_up": return "bg-secondary text-secondary-foreground";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function ReferralsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(adminListReferrals);
  const reward = useServerFn(markReferralRewarded);

  const { data: refs = [], isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: () => list(),
  });

  const markRewarded = async (id: string) => {
    try {
      await reward({ data: { id } });
      toast.success("Marked as rewarded");
      qc.invalidateQueries({ queryKey: ["admin-referrals"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const stats = {
    total: refs.length,
    purchased: refs.filter((r: any) => r.status === "purchased").length,
    rewarded: refs.filter((r: any) => r.status === "rewarded").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Referrals</h1>
        <p className="text-sm text-muted-foreground">Track referrals and issue rewards.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">Total</div><div className="mt-1 text-2xl font-semibold">{stats.total}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">Purchased</div><div className="mt-1 text-2xl font-semibold">{stats.purchased}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">Rewarded</div><div className="mt-1 text-2xl font-semibold">{stats.rewarded}</div></Card>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : refs.length === 0 ? (
        <Card className="p-12 text-center">
          <Gift className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <div className="font-medium">No referrals yet</div>
        </Card>
      ) : (
        <div className="space-y-2">
          {refs.map((r: any) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{r.referrer?.full_name ?? r.referrer?.email ?? "Unknown"}</span>
                  <span className="text-muted-foreground"> invited </span>
                  <span className="font-medium">{r.referred?.full_name ?? r.referred?.email ?? r.referred_email ?? "—"}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()} · #{r.id.slice(0, 8).toUpperCase()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusColor(r.status)}>{r.status.replace("_", " ")}</Badge>
                {r.status === "purchased" && (
                  <Button size="sm" variant="outline" onClick={() => markRewarded(r.id)}>Mark rewarded</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
