import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, BookCheck, CreditCard, Clock, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getDashboard } from "@/lib/dashboard.functions";
import { useSettings } from "@/hooks/use-settings";
import { Panel, EmptyState, SkeletonBlock } from "@/components/dashboard/primitives";

export const Route = createFileRoute("/_authenticated/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — My Family History Book" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
});

const icons = {
  book_ready: BookCheck,
  payment: CreditCard,
  reminder: Clock,
} as const;

function NotificationsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const { announcement } = useSettings();
  const showAnnouncement = Boolean(announcement?.enabled && announcement.message);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-muted-foreground">Updates about your books, payments and account.</p>
      </div>

      {showAnnouncement && (
        <Panel title="Announcement">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Megaphone className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm">{announcement?.message}</p>
              {announcement?.button_label && announcement?.button_href && (
                <a
                  href={announcement.button_href}
                  className="mt-1 inline-block text-xs text-primary hover:underline"
                >
                  {announcement.button_label}
                </a>
              )}
            </div>
          </div>
        </Panel>
      )}

      {isLoading ? (
        <SkeletonBlock className="h-64" />
      ) : !data || data.notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="New updates about your books and orders will show up here."
        />
      ) : (
        <Panel title={`${data.notifications.length} update${data.notifications.length > 1 ? "s" : ""}`}>
          <ul className="divide-y divide-border/60">
            {data.notifications.map((n: any) => {
              const Icon = icons[n.kind as keyof typeof icons] ?? Bell;
              const body = (
                <div className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={n.id} className="transition-colors hover:bg-accent/40">
                  {n.bookId ? (
                    <Link to="/books/$bookId" params={{ bookId: n.bookId }} className="block">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
