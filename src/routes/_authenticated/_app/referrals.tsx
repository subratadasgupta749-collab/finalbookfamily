import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyReferralCode, listMyReferrals } from "@/lib/referrals.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Gift, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals — My Family History Book" },
      { name: "description", content: "Invite friends and earn rewards." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReferralsPage,
});

function statusColor(s: string) {
  switch (s) {
    case "purchased":
    case "rewarded": return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
    case "signed_up": return "bg-primary/10 text-primary border-primary/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function ReferralsPage() {
  const fetchCode = useServerFn(getMyReferralCode);
  const fetchList = useServerFn(listMyReferrals);
  const { data: codeData } = useQuery({ queryKey: ["my-ref-code"], queryFn: () => fetchCode() });
  const { data: refs = [] } = useQuery({ queryKey: ["my-refs"], queryFn: () => fetchList() });

  const code = codeData?.code ?? "";
  const shareUrl =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/auth?mode=register&ref=${code}`
      : "";

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "My Family History Book",
          text: "Preserve your family story in a beautiful memoir book.",
          url: shareUrl,
        });
      } catch { /* dismissed */ }
    } else {
      copy(shareUrl);
    }
  };

  const purchased = refs.filter((r: any) => r.status === "purchased" || r.status === "rewarded").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Refer & earn</h1>
        <p className="text-sm text-muted-foreground">
          Share your link. When a friend creates their first book, you get a thank-you reward.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">Total invited</div><div className="mt-1 text-2xl font-semibold">{refs.length}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">Purchased</div><div className="mt-1 text-2xl font-semibold">{purchased}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">Your code</div><div className="mt-1 font-mono text-lg tracking-wider">{code || "—"}</div></Card>
      </div>

      <Card className="p-6 space-y-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your share link</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 text-sm">{shareUrl || "—"}</div>
          <Button variant="outline" onClick={() => copy(shareUrl)}><Copy className="mr-2 h-4 w-4" /> Copy</Button>
          <Button onClick={share}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold">Your referrals</h2>
        {refs.length === 0 ? (
          <Card className="p-12 text-center">
            <Gift className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
            <div className="font-medium">No referrals yet</div>
            <div className="mt-1 text-sm text-muted-foreground">Share your link to get started.</div>
          </Card>
        ) : (
          <div className="space-y-2">
            {refs.map((r: any) => (
              <Card key={r.id} className="flex items-center justify-between p-4">
                <div className="text-sm">
                  <div className="font-medium">Referral #{r.id.slice(0, 8).toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="outline" className={statusColor(r.status)}>{r.status.replace("_", " ")}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
