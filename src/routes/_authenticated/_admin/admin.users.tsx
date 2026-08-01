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
import { Edit2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { adminUpdateUser, adminDeleteUser } from "@/lib/admin.functions";

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
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const updateUserFn = useServerFn(adminUpdateUser);
  const deleteUserFn = useServerFn(adminDeleteUser);

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

  const onEditSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const full_name = fd.get("full_name") as string;
    setActionBusy(true);
    try {
      await updateUserFn({ data: { userId: editingUser.id, email, full_name } });
      toast.success("User updated");
      setEditingUser(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setActionBusy(false); }
  };

  const onDeleteConfirm = async () => {
    setActionBusy(true);
    try {
      await deleteUserFn({ data: { userId: deletingUser.id } });
      toast.success("User deleted");
      setDeletingUser(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setActionBusy(false); }
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
              <TableHead className="text-center">Admin</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busy && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!busy && data.rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No users</TableCell></TableRow>}
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
                  <TableCell className="text-center">
                    <Switch checked={isAdmin} onCheckedChange={() => toggleRole(u.id, isAdmin)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditingUser(u)} title="Edit user">
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingUser(u)} title="Delete user">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="px-4 py-3"><Pager page={page} pageSize={pageSize} total={data.total} onPage={setPage} /></div>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={onEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input name="full_name" defaultValue={editingUser.full_name || ""} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={editingUser.email || ""} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button type="submit" disabled={actionBusy}>
                  {actionBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingUser} onOpenChange={(o) => !o && setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingUser?.full_name || deletingUser?.email}? 
              This will permanently remove their account, books, photos, and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>Cancel</Button>
            <Button variant="destructive" onClick={onDeleteConfirm} disabled={actionBusy}>
              {actionBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
