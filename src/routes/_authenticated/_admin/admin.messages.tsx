import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listMessages, markMessage } from "@/lib/admin.functions";
import { replyToMessage } from "@/lib/email.functions";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AdminPageHeader, FiltersBar, Pager, useDebounced } from "@/components/admin/table-controls";
import { toCsv, downloadCsv } from "@/lib/csv";
import { toast } from "sonner";
import { CheckCircle, Circle, Trash2, Reply } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/messages")({
  head: () => ({ meta: [{ title: "Messages — Admin" }, { name: "robots", content: "noindex" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const dq = useDebounced(q, 300);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [data, setData] = useState<Awaited<ReturnType<typeof listMessages>>>({ rows: [], total: 0 });
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);

  const load = () => {
    setBusy(true);
    listMessages({ data: { page, pageSize, q: dq, status } })
      .then(setData).catch((e) => toast.error(e.message)).finally(() => setBusy(false));
  };
  useEffect(() => { load(); }, [dq, page, status]);
  useEffect(() => { setPage(1); }, [dq, status]);

  const act = async (id: string, opts: { read?: boolean; del?: boolean }) => {
    try { await markMessage({ data: { id, ...opts } }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const exportCsv = () => {
    downloadCsv("messages.csv", toCsv(data.rows.map((m: any) => ({
      id: m.id, name: m.name, email: m.email, read: m.read,
      created_at: m.created_at, message: m.message,
    }))));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <AdminPageHeader title="Contact Messages" subtitle={`${data.total.toLocaleString()} total`} />
      <FiltersBar q={q} onQ={setQ} placeholder="Search name, email, message…"
        status={status} onStatus={setStatus}
        statusOptions={[{ label: "Unread", value: "unread" }, { label: "Read", value: "read" }]}
        onExport={exportCsv} />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busy && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!busy && data.rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No messages</TableCell></TableRow>}
            {data.rows.map((m: any) => (
              <TableRow key={m.id} className={m.read ? "" : "bg-primary/5"}>
                <TableCell>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </TableCell>
                <TableCell className="max-w-md whitespace-pre-wrap text-sm">{m.message}</TableCell>
                <TableCell>
                  {m.read ? <Badge variant="secondary">Read</Badge> : <Badge>New</Badge>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(m.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" title="Reply via email" onClick={() => setReplyTo(m)}>
                    <Reply className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => act(m.id, { read: !m.read })}>
                    {m.read ? <Circle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => act(m.id, { del: true })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-4 py-3"><Pager page={page} pageSize={pageSize} total={data.total} onPage={setPage} /></div>
      </Card>

      <ReplyDialog message={replyTo} onClose={() => setReplyTo(null)} onSent={() => { setReplyTo(null); load(); }} />
    </div>
  );
}

function ReplyDialog({ message, onClose, onSent }: { message: any; onClose: () => void; onSent: () => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (message) {
      setSubject(`Re: your message`);
      setBody("");
    }
  }, [message]);

  const send = async () => {
    setSending(true);
    try {
      await replyToMessage({ data: { messageId: message.id, subject, message: body } });
      toast.success("Reply sent");
      onSent();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!message} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reply to {message?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="text-xs text-muted-foreground">Original message from {message?.email}:</div>
            <div className="mt-1 whitespace-pre-wrap">{message?.message}</div>
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Your reply</Label>
            <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi…" />
          </div>
          <p className="text-xs text-muted-foreground">
            Uses the <code>contact_reply</code> template. Requires an email domain to be set up.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending || !subject || !body}>{sending ? "Sending…" : "Send reply"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
