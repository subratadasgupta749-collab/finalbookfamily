import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { getCostOverview } from "@/lib/ai/enterprise.functions";

export const Route = createFileRoute("/_authenticated/_admin/admin/ai-costs")({
  head: () => ({ meta: [{ title: "AI Costs — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setData(await getCostOverview()); }
      catch (e: any) { toast.error(e?.message ?? "Failed"); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Cost Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Token and USD usage across providers, features, models and users.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Today" value={`$${data.day.cost.toFixed(4)}`} sub={`${data.day.tokensIn.toLocaleString()} in · ${data.day.tokensOut.toLocaleString()} out`} />
        <Stat label="This month" value={`$${data.month.cost.toFixed(4)}`} sub={`${data.month.tokensIn.toLocaleString()} in · ${data.month.tokensOut.toLocaleString()} out`} />
        <Stat label="All-time" value={`$${Number(data.totalCost).toFixed(4)}`} sub="cumulative spend" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Breakdown title="By provider (this month)" rows={data.month.perProvider} />
        <Breakdown title="By feature (this month)" rows={data.month.perFeature} />
        <Breakdown title="By model (this month)" rows={data.month.perModel} />
        <Breakdown title="By user (this month)" rows={data.month.perUser} truncateKey />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="h-4 w-4" /> {label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}

function Breakdown({ title, rows, truncateKey }: { title: string; rows: Record<string, number>; truncateKey?: boolean }) {
  const entries = Object.entries(rows ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 text-sm">{title}</h3>
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-xs">
              <span className="truncate max-w-[70%]" title={k}>{truncateKey ? k.slice(0, 8) + "…" : k}</span>
              <span>${v.toFixed(4)}</span>
            </div>
            <div className="h-1.5 rounded bg-muted mt-1"><div className="h-1.5 rounded bg-primary" style={{ width: `${(v / total) * 100}%` }} /></div>
          </div>
        ))}
        {entries.length === 0 && <div className="text-xs text-muted-foreground">No data yet.</div>}
      </div>
    </Card>
  );
}
