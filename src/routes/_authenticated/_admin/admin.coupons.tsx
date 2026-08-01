import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listCoupons, saveCoupon, deleteCoupon } from "@/lib/coupons.functions";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Tag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/coupons")({
  head: () => ({ meta: [{ title: "Coupons — Admin" }, { name: "robots", content: "noindex" }] }),
  component: CouponsAdmin,
});

type Coupon = {
  id?: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  expires_at: string | null;
  active: boolean;
  notes: string | null;
  used_count?: number;
};

function CouponsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listCoupons);
  const save = useServerFn(saveCoupon);
  const del = useServerFn(deleteCoupon);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => list(),
  });

  const [editing, setEditing] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);

  const startNew = () => {
    setEditing({
      code: "",
      discount_type: "percent",
      discount_value: 10,
      max_uses: null,
      expires_at: null,
      active: true,
      notes: null,
    });
    setOpen(true);
  };

  const startEdit = (c: Coupon) => {
    setEditing({ ...c });
    setOpen(true);
  };

  const submit = async () => {
    if (!editing) return;
    try {
      const payload: any = {
        ...editing,
        discount_value: Number(editing.discount_value),
        max_uses: editing.max_uses ? Number(editing.max_uses) : null,
        expires_at: editing.expires_at || null,
      };
      await save({ data: payload });
      toast.success("Coupon saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    try {
      await del({ data: { id } });
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coupons</h1>
          <p className="text-sm text-muted-foreground">Discount codes for checkout.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew}><Plus className="mr-2 h-4 w-4" /> New coupon</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div>
                  <Label>Code</Label>
                  <Input
                    value={editing.code}
                    onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                    placeholder="SAVE10"
                    maxLength={32}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={editing.discount_type}
                      onValueChange={(v) => setEditing({ ...editing, discount_type: v as any })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percent (%)</SelectItem>
                        <SelectItem value="fixed">Fixed amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Value</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={editing.discount_value}
                      onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Max uses (optional)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editing.max_uses ?? ""}
                      onChange={(e) => setEditing({ ...editing, max_uses: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                  <div>
                    <Label>Expires (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={editing.expires_at ? editing.expires_at.slice(0, 16) : ""}
                      onChange={(e) => setEditing({
                        ...editing,
                        expires_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input
                    value={editing.notes ?? ""}
                    onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                    placeholder="Internal note"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Active</div>
                    <div className="text-xs text-muted-foreground">Disabled coupons can't be applied.</div>
                  </div>
                  <Switch
                    checked={editing.active}
                    onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : coupons.length === 0 ? (
        <Card className="p-12 text-center">
          <Tag className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <div className="font-medium">No coupons yet</div>
          <div className="mt-1 text-sm text-muted-foreground">Create your first discount code.</div>
        </Card>
      ) : (
        <div className="space-y-2">
          {coupons.map((c: any) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{c.code}</span>
                  {c.active ? (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-500/10 text-emerald-700">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.discount_type === "percent" ? `${c.discount_value}% off` : `${Number(c.discount_value).toFixed(2)} off`}
                  {" · "}
                  {c.used_count ?? 0}{c.max_uses ? ` / ${c.max_uses}` : ""} used
                  {c.expires_at && ` · expires ${new Date(c.expires_at).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => startEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
