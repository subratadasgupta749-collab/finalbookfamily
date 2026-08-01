/** Server-only aggregation helpers for the user dashboard. */

type Ctx = { supabase: any; userId: string };

export type ActivityItem = {
  id: string;
  kind:
    | "book_created"
    | "interview_started"
    | "interview_completed"
    | "photo_uploaded"
    | "book_generated"
    | "payment"
    | "download";
  title: string;
  subtitle?: string | null;
  at: string;
};

export async function loadDashboard(ctx: Ctx) {
  const { supabase, userId } = ctx;

  const [
    profileRes,
    booksRes,
    exportsRes,
    ordersRes,
    topicsRes,
    photosRes,
    manuscriptsRes,
    referralsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url, email").eq("id", userId).maybeSingle(),
    supabase
      .from("books")
      .select("id, name, nickname, relationship, country, status, progress, created_at, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("book_exports")
      .select("id, book_id, kind, filename, storage_path, size_bytes, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("payment_transactions")
      .select("id, amount, currency, status, description, gateway_slug, external_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("interview_topics")
      .select("id, book_id, topic, status, completed_at, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("photos")
      .select("id, book_id, filename, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("book_manuscripts")
      .select("id, book_id, theme, generated_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("referrals")
      .select("id, status, reward_amount, created_at")
      .eq("referrer_user_id", userId),
  ]);

  const books = (booksRes.data ?? []) as any[];
  const bookName = new Map(books.map((b) => [b.id, b.name as string]));

  // Signed URLs for the most recent exports.
  const exportRows = (exportsRes.data ?? []) as any[];
  let urlMap = new Map<string, string>();
  if (exportRows.length > 0) {
    const { data: signed } = await supabase.storage
      .from("book-exports")
      .createSignedUrls(
        exportRows.map((r) => r.storage_path),
        60 * 60,
      );
    urlMap = new Map((signed ?? []).map((s: any) => [s.path as string, s.signedUrl as string]));
  }
  const downloads = exportRows.map((r) => ({
    ...r,
    book_name: bookName.get(r.book_id) ?? null,
    url: urlMap.get(r.storage_path) ?? null,
  }));

  const orders = (ordersRes.data ?? []) as any[];
  const topics = ((topicsRes.data ?? []) as any[]).filter((t) => bookName.has(t.book_id));
  const photos = (photosRes.data ?? []) as any[];
  const manuscripts = (manuscriptsRes.data ?? []) as any[];
  const referrals = (referralsRes.data ?? []) as any[];

  // --- Activity timeline (derived from real records only) ---
  const activity: ActivityItem[] = [];
  for (const b of books) {
    activity.push({
      id: `book-${b.id}`,
      kind: "book_created",
      title: "Book created",
      subtitle: b.name,
      at: b.created_at,
    });
  }
  for (const t of topics) {
    if (t.status === "completed" && t.completed_at) {
      activity.push({
        id: `topic-c-${t.id}`,
        kind: "interview_completed",
        title: `Topic completed — ${t.topic}`,
        subtitle: bookName.get(t.book_id) ?? null,
        at: t.completed_at,
      });
    } else if (t.status === "in_progress") {
      activity.push({
        id: `topic-s-${t.id}`,
        kind: "interview_started",
        title: `Interview started — ${t.topic}`,
        subtitle: bookName.get(t.book_id) ?? null,
        at: t.updated_at ?? t.created_at,
      });
    }
  }
  for (const p of photos) {
    activity.push({
      id: `photo-${p.id}`,
      kind: "photo_uploaded",
      title: "Photo uploaded",
      subtitle: `${p.filename}${bookName.get(p.book_id) ? ` · ${bookName.get(p.book_id)}` : ""}`,
      at: p.created_at,
    });
  }
  for (const m of manuscripts) {
    if (m.generated_at) {
      activity.push({
        id: `ms-${m.id}`,
        kind: "book_generated",
        title: "Book generated",
        subtitle: bookName.get(m.book_id) ?? null,
        at: m.generated_at,
      });
    }
  }
  for (const o of orders) {
    activity.push({
      id: `order-${o.id}`,
      kind: "payment",
      title: o.status === "succeeded" ? "Payment completed" : `Payment ${o.status}`,
      subtitle: o.description ?? `${o.currency} ${Number(o.amount).toFixed(2)}`,
      at: o.created_at,
    });
  }
  for (const d of downloads) {
    activity.push({
      id: `dl-${d.id}`,
      kind: "download",
      title: `${String(d.kind).toUpperCase().replace("_", " ")} exported`,
      subtitle: d.book_name,
      at: d.created_at,
    });
  }
  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // --- Notifications (derived from real state) ---
  const notifications: {
    id: string;
    kind: "book_ready" | "payment" | "reminder";
    title: string;
    body?: string | null;
    at: string;
    href?: string | null;
    bookId?: string | null;
  }[] = [];
  for (const m of manuscripts) {
    if (m.generated_at) {
      notifications.push({
        id: `n-ms-${m.id}`,
        kind: "book_ready",
        title: "Your book is ready",
        body: bookName.get(m.book_id) ?? null,
        at: m.generated_at,
        bookId: m.book_id,
      });
    }
  }
  for (const o of orders) {
    if (o.status === "succeeded") {
      notifications.push({
        id: `n-o-${o.id}`,
        kind: "payment",
        title: "Payment successful",
        body: `${o.currency} ${Number(o.amount).toFixed(2)}${o.description ? ` · ${o.description}` : ""}`,
        at: o.created_at,
      });
    }
  }
  for (const b of books) {
    if (b.status !== "completed" && b.progress < 100) {
      notifications.push({
        id: `n-b-${b.id}`,
        kind: "reminder",
        title: "Interview reminder",
        body: `${b.name} is ${b.progress}% complete`,
        at: b.updated_at,
        bookId: b.id,
      });
    }
  }
  notifications.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const bookIdsWithExports = new Set(exportRows.map((r) => r.book_id));

  return {
    profile: {
      full_name: profileRes.data?.full_name ?? null,
      avatar_url: profileRes.data?.avatar_url ?? null,
      email: profileRes.data?.email ?? null,
      country: books.find((b) => b.country)?.country ?? null,
    },
    books,
    counts: {
      total: books.length,
      draft: books.filter((b) => b.status === "draft").length,
      inProgress: books.filter((b) => b.status === "in_progress").length,
      completed: books.filter((b) => b.status === "completed").length,
      downloaded: bookIdsWithExports.size,
    },
    downloads,
    orders,
    referrals: {
      count: referrals.length,
      joined: referrals.filter((r) => r.referred_user_id || r.status !== "pending").length,
      earnings: referrals.reduce((s, r) => s + Number(r.reward_amount ?? 0), 0),
    },
    activity: activity.slice(0, 12),
    notifications: notifications.slice(0, 12),
  };
}
