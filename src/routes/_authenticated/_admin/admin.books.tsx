import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminListBooks } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, FiltersBar, Pager, useDebounced } from "@/components/admin/table-controls";
import { toCsv, downloadCsv } from "@/lib/csv";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/admin/books")({
  head: () => ({ meta: [{ title: "Books — Admin" }, { name: "robots", content: "noindex" }] }),
  component: BooksAdmin,
});

function BooksAdmin() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const dq = useDebounced(q, 300);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListBooks>>>({ rows: [], total: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBusy(true);
    adminListBooks({ data: { page, pageSize, q: dq, status } })
      .then(setData).catch((e) => toast.error(e.message)).finally(() => setBusy(false));
  }, [dq, page, status]);
  useEffect(() => { setPage(1); }, [dq, status]);

  const exportCsv = () => {
    downloadCsv("books.csv", toCsv(data.rows.map((b: any) => ({
      id: b.id, name: b.name, status: b.status, progress: b.progress,
      owner_email: b.owner?.email, owner_name: b.owner?.full_name,
      updated_at: b.updated_at, created_at: b.created_at,
    }))));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <AdminPageHeader title="Books" subtitle={`${data.total.toLocaleString()} total`} />
      <FiltersBar q={q} onQ={setQ} placeholder="Search by name or nickname…"
        status={status} onStatus={setStatus}
        statusOptions={[
          { label: "Draft", value: "draft" },
          { label: "In progress", value: "in_progress" },
          { label: "Completed", value: "completed" },
        ]}
        onExport={exportCsv} />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Book</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busy && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!busy && data.rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No books</TableCell></TableRow>}
            {data.rows.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="font-medium">{b.name}</div>
                  {b.nickname && <div className="text-xs text-muted-foreground">{b.nickname}</div>}
                </TableCell>
                <TableCell className="text-sm">
                  {b.owner?.full_name || "—"}
                  <div className="text-xs text-muted-foreground">{b.owner?.email}</div>
                </TableCell>
                <TableCell><Badge variant="secondary">{b.status}</Badge></TableCell>
                <TableCell>{b.progress}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(b.updated_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-4 py-3"><Pager page={page} pageSize={pageSize} total={data.total} onPage={setPage} /></div>
      </Card>
    </div>
  );
}
