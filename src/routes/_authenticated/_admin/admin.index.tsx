import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getOverview } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Users, BookHeart, FileText, Mail, ShoppingBag, DollarSign } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/_admin/admin/")({
  head: () => ({ meta: [{ title: "Admin — My Family History Book" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getOverview>> | null>(null);
  useEffect(() => { getOverview().then(setData).catch(() => {}); }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Platform overview and recent activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={DollarSign} label={`Revenue (${data?.revenue.currency ?? "USD"})`}
          value={data ? data.revenue.total.toFixed(2) : "—"} />
        <Stat icon={ShoppingBag} label="Orders" value={data?.counts.orders} />
        <Stat icon={Users} label="Users" value={data?.counts.users} />
        <Stat icon={BookHeart} label="Books" value={data?.counts.books} />
        <Stat icon={FileText} label="Blog posts" value={data?.counts.blogPosts} />
        <Stat icon={Mail} label="Unread messages" value={data?.counts.unreadMessages} />
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Last 14 days</h2>
        <div className="h-72">
          {data && (
            <ResponsiveContainer>
              <AreaChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#8B5E3C" fill="#8B5E3C" fillOpacity={0.2} name="New users" />
                <Area type="monotone" dataKey="revenue" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.2} name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div>
      <div className="mt-2 text-2xl font-semibold">{value ?? "—"}</div>
    </Card>
  );
}
