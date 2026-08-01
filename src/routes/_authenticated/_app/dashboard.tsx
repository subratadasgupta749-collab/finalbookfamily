import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  PenLine,
  Clock,
  CheckCircle2,
  Download,
  Play,
  Eye,
  Copy,
  Trash2,
  Receipt,
  Bell,
  Gift,
  Activity,
  ArrowRight,
  Library,
  Mail,
  Globe,
  BadgeCheck,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDashboard } from "@/lib/dashboard.functions";
import { deleteBook, duplicateBook } from "@/lib/books.functions";
import { getMyReferralCode } from "@/lib/referrals.functions";
import {
  Panel,
  StatCard,
  EmptyState,
  DashboardSkeleton,
  StatusPill,
} from "@/components/dashboard/primitives";

const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboard(),
});

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — My Family History Book" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(dashboardQuery);
  const { data: ref } = useQuery({
    queryKey: ["referral-code"],
    queryFn: () => getMyReferralCode(),
  });

  const now = useMemo(() => new Date(), []);
  const name =
    data?.profile.full_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "there";
  const initial = (name?.[0] ?? "U").toUpperCase();

  const del = useMutation({
    mutationFn: (id: string) => deleteBook({ data: { id } }),
    onSuccess: () => {
      toast.success("Book deleted");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const dup = useMutation({
    mutationFn: (id: string) => duplicateBook({ data: { id } }),
    onSuccess: () => {
      toast.success("Book duplicated");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-6xl">
        <DashboardSkeleton />
      </div>
    );
  }

  const books = data.books;
  const active = books.find((b: any) => b.status !== "completed" && b.progress < 100);
  const latestDownload = data.downloads[0];
  const referralLink =
    ref?.code && typeof window !== "undefined"
      ? `${window.location.origin}/auth?ref=${ref.code}`
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border/60 bg-background p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="h-12 w-12 shrink-0">
            {data.profile.avatar_url && <AvatarImage src={data.profile.avatar_url} alt="" />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {greeting(now)} · Welcome back
            </p>
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {format(now, "EEEE, d MMMM yyyy")}
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="hidden sm:inline-flex">
          <Link to="/books/new">
            <Plus className="mr-2 h-4 w-4" /> New Book
          </Link>
        </Button>
      </header>

      {/* Quick actions */}
      <Panel title="Quick actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/books/new" icon={Plus} label="Create New Book" primary />
          {active ? (
            <QuickAction
              to="/books/$bookId/interview"
              params={{ bookId: active.id }}
              icon={Play}
              label="Continue Last Interview"
            />
          ) : null}
          <QuickAction to="/books" icon={Library} label="View My Books" />
          {latestDownload?.url ? (
            <a
              href={latestDownload.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background p-4 text-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Download className="h-4 w-4" />
              </span>
              <span className="min-w-0 truncate font-medium">Download Latest Book</span>
            </a>
          ) : null}
        </div>
      </Panel>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={BookOpen} label="Total Books" value={data.counts.total} delay={0} />
        <StatCard icon={PenLine} label="Draft Books" value={data.counts.draft} delay={60} />
        <StatCard icon={Clock} label="In Progress" value={data.counts.inProgress} delay={120} />
        <StatCard icon={CheckCircle2} label="Completed" value={data.counts.completed} delay={180} />
        <StatCard icon={Download} label="Downloaded" value={data.counts.downloaded} delay={240} />
      </div>

      {/* Continue your story */}
      {active && (
        <section className="animate-fade-in overflow-hidden rounded-2xl border border-primary/25 bg-primary/5 p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Continue your story
          </p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold tracking-tight">{active.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {active.relationship ? `${active.relationship} · ` : ""}Last edited{" "}
                {formatDistanceToNow(new Date(active.updated_at), { addSuffix: true })}
              </p>
              <Progress value={active.progress} className="mt-4 h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {active.progress}% complete · about{" "}
                {Math.max(5, Math.round((100 - active.progress) * 0.6))} min remaining
              </p>
            </div>
            <Button asChild size="lg" className="w-full lg:w-auto">
              <Link to="/books/$bookId/interview" params={{ bookId: active.id }}>
                <Play className="mr-2 h-4 w-4" /> Resume Interview
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* Recent books / empty state */}
      {books.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="You haven't created your first Family History Book yet."
          description="Start an AI-guided interview and turn cherished memories into a beautifully written keepsake."
          action={
            <Button asChild size="lg">
              <Link to="/books/new">
                <Plus className="mr-2 h-4 w-4" /> Create Your First Book
              </Link>
            </Button>
          }
        />
      ) : (
        <Panel
          title="Recent books"
          action={
            <Link to="/books" className="text-sm text-primary hover:underline">
              View all
            </Link>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {books.slice(0, 6).map((b: any) => (
              <article
                key={b.id}
                className="group rounded-2xl border border-border/60 bg-background p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{b.name}</h3>
                    {b.relationship && (
                      <p className="truncate text-xs text-muted-foreground">{b.relationship}</p>
                    )}
                  </div>
                  <StatusPill status={b.status} />
                </div>
                <Progress value={b.progress} className="mt-4 h-1.5" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {b.progress}% · created {format(new Date(b.created_at), "d MMM yyyy")} · edited{" "}
                  {formatDistanceToNow(new Date(b.updated_at), { addSuffix: true })}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/books/$bookId/interview" params={{ bookId: b.id }}>
                      <Play className="mr-1.5 h-3.5 w-3.5" /> Resume
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/books/$bookId/preview" params={{ bookId: b.id }}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dup.mutate(b.id)}
                    disabled={dup.isPending}
                    aria-label={`Duplicate ${b.name}`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete "${b.name}"? This cannot be undone.`)) del.mutate(b.id);
                    }}
                    disabled={del.isPending}
                    aria-label={`Delete ${b.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity */}
        {data.activity.length > 0 && (
          <Panel title="Recent activity">
            <ol className="relative space-y-4 border-l border-border/60 pl-5">
              {data.activity.map((a: any) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background bg-primary" />
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.subtitle && (
                    <p className="truncate text-xs text-muted-foreground">{a.subtitle}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(a.at), { addSuffix: true })}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        )}

        <div className="space-y-6">
          {/* Notifications */}
          {data.notifications.length > 0 && (
            <Panel
              title="Notifications"
              action={
                <Link to="/notifications" className="text-sm text-primary hover:underline">
                  See all
                </Link>
              }
            >
              <ul className="space-y-3">
                {data.notifications.slice(0, 4).map((n: any) => (
                  <li key={n.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bell className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/* Orders */}
          {data.orders.length > 0 && (
            <Panel
              title="Orders"
              action={
                <Link to="/orders" className="text-sm text-primary hover:underline">
                  All orders
                </Link>
              }
            >
              <ul className="space-y-3">
                {data.orders.map((o: any) => (
                  <li key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {o.description ?? "Book order"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {format(new Date(o.created_at), "d MMM yyyy")} ·{" "}
                        {o.currency} {Number(o.amount).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={o.status} />
                      <Link
                        to="/orders"
                        className="text-xs text-primary hover:underline"
                        aria-label="View invoice"
                      >
                        <Receipt className="h-4 w-4" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/* Downloads */}
          {data.downloads.length > 0 && (
            <Panel
              title="Downloads"
              description={`${data.downloads.length} recent export${data.downloads.length > 1 ? "s" : ""}`}
              action={
                <Link to="/downloads" className="text-sm text-primary hover:underline">
                  All files
                </Link>
              }
            >
              <ul className="space-y-3">
                {data.downloads.slice(0, 4).map((d: any) => (
                  <li key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.filename}</p>
                      <p className="truncate text-xs uppercase text-muted-foreground">
                        {String(d.kind).replace("_", " ")} · {d.book_name ?? ""}
                      </p>
                    </div>
                    {d.url && (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary"
                        aria-label={`Download ${d.filename}`}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile summary */}
        <Panel
          title="Profile"
          action={
            <Link to="/profile" className="text-sm text-primary hover:underline">
              Edit
            </Link>
          }
        >
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-14 w-14 shrink-0">
              {data.profile.avatar_url && <AvatarImage src={data.profile.avatar_url} alt="" />}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <p className="truncate font-semibold">{name}</p>
              <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" /> {data.profile.email ?? user?.email}
              </p>
              {data.profile.country && (
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <Globe className="h-3.5 w-3.5 shrink-0" /> {data.profile.country}
                </p>
              )}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                {data.orders.some((o: any) => o.status === "succeeded") ? "Premium member" : "Free member"}
              </p>
            </div>
          </div>
        </Panel>

        {/* Referrals */}
        <Panel
          title="Referrals"
          action={
            <Link to="/referrals" className="text-sm text-primary hover:underline">
              Details
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-semibold">{data.referrals.joined}</div>
              <div className="text-xs text-muted-foreground">Friends joined</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">${data.referrals.earnings.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Total earnings</div>
            </div>
          </div>
          {referralLink && (
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                readOnly
                value={referralLink}
                className="min-w-0 truncate rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  toast.success("Referral link copied");
                }}
              >
                <Gift className="mr-1.5 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          )}
        </Panel>
      </div>

      {/* Help */}
      <Panel title="Need a hand?">
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickAction to="/help" icon={Activity} label="Help Center & FAQ" />
          <QuickAction to="/contact" icon={ArrowRight} label="Contact Support" />
        </div>
      </Panel>
    </div>
  );
}

function QuickAction({
  to,
  params,
  icon: Icon,
  label,
  primary,
}: {
  to: string;
  params?: Record<string, string>;
  icon: typeof Plus;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      className={`group flex items-center gap-3 rounded-xl border p-4 text-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        primary
          ? "border-primary/40 bg-primary/5 hover:border-primary"
          : "border-border/60 bg-background hover:border-primary/40"
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 truncate font-medium">{label}</span>
    </Link>
  );
}
