import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BookHeart, Shield, LogOut, CreditCard, FileText, Users, BookOpen, ShoppingBag, Mail, Settings, BarChart3, Sparkles, MessageSquare, Activity, Send, Inbox, Tag, Gift, Trash2, Layers, Route as RouteIcon, GitBranch, HeartPulse, DollarSign, Gauge, ScrollText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (error || !data) throw redirect({ to: "/dashboard" });
  },
  component: AdminShell,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: Shield },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/books", label: "Books", icon: BookOpen },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/messages", label: "Messages", icon: Mail },
  { to: "/admin/blog", label: "Blog", icon: FileText },
  { to: "/admin/payment-gateways", label: "Payment Gateways", icon: CreditCard },
  { to: "/admin/ai-providers", label: "AI Providers", icon: Sparkles },
  { to: "/admin/ai-models", label: "AI Models", icon: Layers },
  { to: "/admin/ai-features", label: "AI Feature Mapping", icon: GitBranch },
  { to: "/admin/ai-routing", label: "AI Routing", icon: RouteIcon },
  { to: "/admin/ai-fallback", label: "AI Fallback", icon: GitBranch },
  { to: "/admin/ai-health", label: "AI Health", icon: HeartPulse },
  { to: "/admin/ai-costs", label: "AI Costs", icon: DollarSign },
  { to: "/admin/ai-limits", label: "AI Limits", icon: Gauge },
  { to: "/admin/ai-prompts", label: "AI Prompts", icon: MessageSquare },
  { to: "/admin/ai-logs", label: "AI Logs", icon: Activity },
  { to: "/admin/ai-audit", label: "AI Audit Log", icon: ScrollText },
  { to: "/admin/email-templates", label: "Email Templates", icon: Send },
  { to: "/admin/email-logs", label: "Email Logs", icon: Inbox },
  { to: "/admin/coupons", label: "Coupons", icon: Tag },
  { to: "/admin/referrals", label: "Referrals", icon: Gift },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/cache", label: "Cache", icon: Trash2 },
] as const;

function AdminShell() {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-background md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-border/60 px-5 font-semibold">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/60 p-3">
          <div className="mb-2 px-3 text-xs text-muted-foreground truncate">{user?.email}</div>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border/60 bg-background px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <BookHeart className="h-4 w-4 text-primary" /> Family Book
          </Link>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            User dashboard →
          </Link>
        </header>
        <div className="flex-1 p-4 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
