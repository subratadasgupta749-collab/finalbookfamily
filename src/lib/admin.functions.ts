import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId, _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

const pageSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
  q: z.string().trim().optional().default(""),
  status: z.string().trim().optional().default(""),
});

const range = (p: number, s: number) => [(p - 1) * s, p * s - 1] as const;

/* ---------------- Overview / Analytics ---------------- */

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const admin = await (await import("@/integrations/supabase/client.server")).supabaseAdmin;

    const [users, books, blog, msgs, txAll, txPaid] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("books").select("id", { count: "exact", head: true }),
      admin.from("blog_posts").select("id", { count: "exact", head: true }),
      admin.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false),
      admin.from("payment_transactions").select("id", { count: "exact", head: true }),
      admin.from("payment_transactions").select("amount, currency, created_at").eq("status", "succeeded"),
    ]);

    const revenue = (txPaid.data ?? []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
    const currency = txPaid.data?.[0]?.currency ?? "USD";

    // 14-day chart: users vs paid revenue
    const days: { date: string; users: number; revenue: number; orders: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), users: 0, revenue: 0, orders: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    const since = days[0].date + "T00:00:00Z";
    const [profRecent, txRecent] = await Promise.all([
      admin.from("profiles").select("created_at").gte("created_at", since),
      admin.from("payment_transactions").select("amount, status, created_at").gte("created_at", since),
    ]);
    for (const p of profRecent.data ?? []) {
      const k = String(p.created_at).slice(0, 10);
      const i = idx.get(k); if (i != null) days[i].users++;
    }
    for (const t of txRecent.data ?? []) {
      const k = String(t.created_at).slice(0, 10);
      const i = idx.get(k); if (i == null) continue;
      days[i].orders++;
      if (t.status === "succeeded") days[i].revenue += Number(t.amount || 0);
    }

    return {
      counts: {
        users: users.count ?? 0,
        books: books.count ?? 0,
        blogPosts: blog.count ?? 0,
        unreadMessages: msgs.count ?? 0,
        orders: txAll.count ?? 0,
      },
      revenue: { total: revenue, currency },
      chart: days,
    };
  });

/* ---------------- Users ---------------- */

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: z.input<typeof pageSchema>) => pageSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const [from, to] = range(data.page, data.pageSize);
    let query = admin.from("profiles").select("id, email, full_name, avatar_url, created_at", { count: "exact" });
    if (data.q) query = query.or(`email.ilike.%${data.q}%,full_name.ilike.%${data.q}%`);
    const { data: rows, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r: any) => r.id);
    const rolesRes = ids.length
      ? await admin.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as any[] };
    const roleMap = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      const arr = roleMap.get(r.user_id) ?? []; arr.push(r.role); roleMap.set(r.user_id, arr);
    }
    return {
      rows: (rows ?? []).map((r: any) => ({ ...r, roles: roleMap.get(r.id) ?? [] })),
      total: count ?? 0,
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "user"; grant: boolean }) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "user"]),
      grant: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    if (data.grant) {
      await admin.from("user_roles").upsert(
        { user_id: data.userId, role: data.role },
        { onConflict: "user_id,role" },
      );
    } else {
      if (data.userId === context.userId && data.role === "admin") {
        throw new Error("You cannot remove your own admin role.");
      }
      await admin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    }
    return { ok: true };
  });

/* ---------------- Books ---------------- */

export const adminListBooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: z.input<typeof pageSchema>) => pageSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const [from, to] = range(data.page, data.pageSize);
    let query = admin.from("books")
      .select("id, name, nickname, status, progress, user_id, created_at, updated_at", { count: "exact" });
    if (data.q) query = query.or(`name.ilike.%${data.q}%,nickname.ilike.%${data.q}%`);
    if (data.status) query = query.eq("status", data.status as any);
    const { data: rows, count, error } = await query.order("updated_at", { ascending: false }).range(from, to);
    if (error) throw new Error(error.message);
    const ids = [...new Set((rows ?? []).map((r: any) => r.user_id))];
    const profs = ids.length
      ? await admin.from("profiles").select("id, email, full_name").in("id", ids)
      : { data: [] as any[] };
    const pmap = new Map((profs.data ?? []).map((p: any) => [p.id, p]));
    return {
      rows: (rows ?? []).map((r: any) => ({ ...r, owner: pmap.get(r.user_id) ?? null })),
      total: count ?? 0,
    };
  });

/* ---------------- Orders / Payments ---------------- */

const orderSchema = pageSchema.extend({
  gateway: z.string().trim().optional().default(""),
});

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: z.input<typeof orderSchema>) => orderSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const [from, to] = range(data.page, data.pageSize);
    let query = admin.from("payment_transactions")
      .select("id, user_id, gateway_slug, external_id, amount, currency, status, created_at, updated_at", { count: "exact" });
    if (data.q) query = query.or(`external_id.ilike.%${data.q}%,id.eq.${data.q}`);
    if (data.status) query = query.eq("status", data.status as any);
    if (data.gateway) query = query.eq("gateway_slug", data.gateway);
    const { data: rows, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error) throw new Error(error.message);
    const ids = [...new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean))];
    const profs = ids.length
      ? await admin.from("profiles").select("id, email, full_name").in("id", ids)
      : { data: [] as any[] };
    const pmap = new Map((profs.data ?? []).map((p: any) => [p.id, p]));

    // revenue summary for current filter (paid only, ignoring pagination)
    let sumQ = admin.from("payment_transactions").select("amount, currency").eq("status", "succeeded");
    if (data.gateway) sumQ = sumQ.eq("gateway_slug", data.gateway);
    const { data: sumRows } = await sumQ;
    const revenue = (sumRows ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const currency = sumRows?.[0]?.currency ?? "USD";

    return {
      rows: (rows ?? []).map((r: any) => ({ ...r, owner: pmap.get(r.user_id) ?? null })),
      total: count ?? 0,
      revenue: { total: revenue, currency },
    };
  });

/* ---------------- Contact Messages ---------------- */

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: z.input<typeof pageSchema>) => pageSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const [from, to] = range(data.page, data.pageSize);
    let query = admin.from("contact_messages")
      .select("id, name, email, message, read, created_at", { count: "exact" });
    if (data.q) query = query.or(`name.ilike.%${data.q}%,email.ilike.%${data.q}%,message.ilike.%${data.q}%`);
    if (data.status === "unread") query = query.eq("read", false);
    if (data.status === "read") query = query.eq("read", true);
    const { data: rows, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const markMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; read?: boolean; del?: boolean }) =>
    z.object({ id: z.string().uuid(), read: z.boolean().optional(), del: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    if (data.del) await admin.from("contact_messages").delete().eq("id", data.id);
    else if (typeof data.read === "boolean")
      await admin.from("contact_messages").update({ read: data.read }).eq("id", data.id);
    return { ok: true };
  });

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; email: string; message: string }) =>
    z.object({
      name: z.string().trim().min(1).max(100),
      email: z.string().trim().email().max(255),
      message: z.string().trim().min(10).max(2000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const { error } = await admin.from("contact_messages").insert(data);
    if (error) throw new Error(error.message);
    const { notifyAdmin } = await import("./email.functions");
    await notifyAdmin("admin_new_message", {
      name: data.name,
      email: data.email,
      message: data.message,
    });
    return { ok: true };
  });

/* ---------------- Settings ---------------- */

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const { data, error } = await admin.from("app_settings").select("*").order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: Record<string, unknown> }) =>
    z.object({ key: z.string().min(1).max(100), value: z.record(z.string(), z.unknown()) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const { error } = await admin.from("app_settings").upsert({
      key: data.key,
      value: data.value as any,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
