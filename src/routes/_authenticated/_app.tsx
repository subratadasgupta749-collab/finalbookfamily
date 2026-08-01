import { createFileRoute, Link, useRouterState, Outlet } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  BookHeart,
  LayoutDashboard,
  BookOpen,
  Plus,
  Receipt,
  Download,
  Gift,
  Bell,
  User as UserIcon,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app")({
  component: AppShell,
});

function AppShell() {
  return (
    <DashboardChrome>
      <Outlet />
    </DashboardChrome>
  );
}

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/books", label: "My Books", icon: BookOpen },
  { to: "/books/new", label: "Create New Book", icon: Plus },
  { to: "/orders", label: "Orders", icon: Receipt },
  { to: "/downloads", label: "Downloads", icon: Download },
  { to: "/referrals", label: "Referrals", icon: Gift },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: UserIcon },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/help", label: "Help Center", icon: HelpCircle },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {nav.map((n) => {
        const active = pathname === n.to;
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150",
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:translate-x-0.5 hover:bg-accent hover:text-foreground",
            )}
          >
            <n.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function DashboardChrome({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { general } = useSettings();
  const [open, setOpen] = useState(false);
  const siteName = general?.site_name || "Family Book";
  const avatar = (user?.user_metadata?.avatar_url as string | undefined) ?? undefined;
  const initial = (user?.email?.[0] ?? "U").toUpperCase();

  const brand = (
    <div className="flex h-16 items-center gap-2 border-b border-border/60 px-5 font-semibold">
      <BookHeart className="h-5 w-5 shrink-0 text-primary" />
      <span className="truncate text-sm">{siteName}</span>
    </div>
  );

  const footer = (
    <div className="border-t border-border/60 p-3">
      <div className="mb-2 flex min-w-0 items-center gap-2 px-2">
        <Avatar className="h-7 w-7 shrink-0">
          {avatar && <AvatarImage src={avatar} alt="" />}
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        </Avatar>
        <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
      </div>
      <button
        onClick={() => signOut()}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-background md:flex md:flex-col">
        {brand}
        <NavList />
        {footer}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 animate-slide-in-right flex-col border-r border-border/60 bg-background">
            {brand}
            <NavList onNavigate={() => setOpen(false)} />
            {footer}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur md:px-6">
          <button
            className="md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link
            to="/"
            className="min-w-0 truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to site
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/notifications" aria-label="Notifications" className="text-muted-foreground transition-colors hover:text-foreground">
              <Bell className="h-5 w-5" />
            </Link>
            <Link to="/profile" aria-label="Profile">
              <Avatar className="h-8 w-8">
                {avatar && <AvatarImage src={avatar} alt="" />}
                <AvatarFallback className="text-xs">{initial}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
