import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getOverview } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/table-controls";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/_admin/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getOverview>> | null>(null);
  useEffect(() => { getOverview().then(setData).catch(() => {}); }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader title="Analytics" subtitle="Growth over the last 14 days" />

      <Card className="p-6">
        <h3 className="mb-3 font-semibold">New users per day</h3>
        <div className="h-64">
          {data && (
            <ResponsiveContainer>
              <LineChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#8B5E3C" strokeWidth={2} name="New users" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-3 font-semibold">Revenue & orders per day</h3>
        <div className="h-64">
          {data && (
            <ResponsiveContainer>
              <BarChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#8B5E3C" name="Orders" />
                <Bar dataKey="revenue" fill="#D4AF37" name={`Revenue (${data.revenue.currency})`} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
