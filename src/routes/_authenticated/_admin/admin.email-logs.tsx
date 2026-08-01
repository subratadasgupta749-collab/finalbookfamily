import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listEmailLogsFn } from "@/lib/email.functions";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, Pager } from "@/components/admin/table-controls";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/admin/email-logs")({
  head: () => ({
    meta: [
      { title: "Email Logs — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailLogsPage,
});

function EmailLogsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [data, setData] = useState<{ rows: any[]; total: number }>({
    rows: [],
    total: 0,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBusy(true);
    listEmailLogsFn({ data: { page, pageSize } })
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setBusy(false));
  }, [page]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <AdminPageHeader
        title="Email Logs"
        subtitle={`${data.total.toLocaleString()} total sends`}
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>To</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busy && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!busy && data.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No emails sent yet
                </TableCell>
              </TableRow>
            )}
            {data.rows.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.to_email}</TableCell>
                <TableCell className="max-w-md truncate">{l.subject}</TableCell>
                <TableCell>
                  <code className="text-xs">{l.template_key ?? "—"}</code>
                </TableCell>
                <TableCell>
                  {l.status === "sent" ? (
                    <Badge>sent</Badge>
                  ) : (
                    <Badge variant="destructive" title={l.error ?? ""}>
                      failed
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(l.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-4 py-3">
          <Pager
            page={page}
            pageSize={pageSize}
            total={data.total}
            onPage={setPage}
          />
        </div>
      </Card>
    </div>
  );
}
