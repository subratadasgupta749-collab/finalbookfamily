import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listUsers, setUserRole } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AdminPageHeader, FiltersBar, Pager, useDebounced } from "@/components/admin/table-controls";
import { toCsv, downloadCsv } from "@/lib/csv";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }, { name: "robots", content: "noindex" }] }),
  component: UsersPage,
});

function UsersPage() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [data, setData] = useState<Awaited<ReturnType<typeof listUsers>>>({ rows: [], total: 0 });
  const [busy, setBusy] = useState(false);

  const load = () => {
    setBusy(true);
    listUsers({ data: { page, pageSize, q: dq, status: "" } })
      .then(setData).catch((e) => toast.error(e.message)).finally(() => setBusy(false));
  };
  useEffect(() => { load(); }, [dq, page]);
  useEffect(() => { setPage(1); }, [dq]);

  const toggleRole = async (userId: string, has: boolean) => {
    try {
      await setUserRole({ data: { userId, role: "admin", grant: !has } });
      toast.success(has ? "Admin removed" : "Admin granted");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const exportCsv = () => {
    downloadCsv("users.csv", toCsv(data.rows.map((r: any) => ({
      id: r.id, email: r.email, full_name: r.full_name, roles: (r.roles || []).join("|"),
      created_at: r.created_at,
    }))));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <AdminPageHeader title="Users" subtitle={`${data.total.toLocaleString()} total`} />
      <FiltersBar q={q} onQ={setQ} placeholder="Search by email or name…" onExport={exportCsv} />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busy && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!busy && data.rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No users</TableCell></TableRow>}
            {data.rows.map((u: any) => {
              const isAdmin = (u.roles || []).includes("admin");
              return (
                <TableRow key={u.id}>
                  <TableCell>{u.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>
                    {(u.roles || []).map((r: string) => (
                      <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="mr-1">{r}</Badge>
                    ))}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch checked={isAdmin} onCheckedChange={() => toggleRole(u.id, isAdmin)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="px-4 py-3"><Pager page={page} pageSize={pageSize} total={data.total} onPage={setPage} /></div>
      </Card>
    </div>
  );
}
