import { Link, useNavigate } from "@tanstack/react-router";
import { BookHeart, Menu, X, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const nav = [
  { href: "/#how", label: "How it works" },
  { href: "/#books", label: "Books" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const { general } = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const initial = (user?.email?.[0] ?? "U").toUpperCase();
  const siteName = general?.site_name || "My Family History Book";
  const logo = general?.logo_url;

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    setOpen(false);
    navigate({ to: "/blog", search: term ? { q: term } : {} });
  };

  const linkCls =
    "text-sm text-[color:var(--muted-foreground)] transition-colors duration-200 hover:text-[color:var(--ink)]";

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b bg-[#FFFDF9]/85 backdrop-blur-md transition-[box-shadow,background-color,border-color] duration-300 ${
        scrolled
          ? "border-[color:var(--border)] bg-[#FFFDF9]/95 shadow-[0_6px_24px_-16px_rgba(80,45,20,0.45)]"
          : "border-[color:var(--border)]/50 shadow-none"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:h-18 sm:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight text-[color:var(--ink)] sm:text-xl"
        >
          {logo ? (
            <img src={logo} alt={siteName} className="h-7 w-auto" />
          ) : (
            <BookHeart className="h-6 w-6 text-[color:var(--primary)]" />
          )}
          <span className="hidden sm:inline">{siteName}</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className={linkCls}>
              {n.label}
            </a>
          ))}
        </nav>

        <form onSubmit={onSearch} className="relative hidden w-full max-w-[200px] md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search articles…"
            aria-label="Search articles"
            className="h-10 rounded-full border-[color:var(--border)] bg-white/70 pl-9 text-sm"
          />
        </form>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white/70 py-1 pl-1 pr-3 text-sm transition hover:bg-white">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                  </Avatar>
                  <span className="max-w-[120px] truncate">{user.email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/auth" className={`hidden lg:inline ${linkCls}`}>
                Sign in
              </Link>
              <Button
                asChild
                className="rounded-full bg-[color:var(--primary)] px-5 text-[color:var(--primary-foreground)] shadow-[var(--shadow-soft)] hover:bg-[color:var(--primary)]/90"
              >
                <Link to="/auth" search={{ mode: "register" }}>
                  Start your book
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[color:var(--border)] bg-[#FFFDF9] md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4">
            <form onSubmit={onSearch} className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search articles…"
                aria-label="Search articles"
                className="h-10 rounded-full border-[color:var(--border)] bg-white pl-9 text-sm"
              />
            </form>
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--ink)]"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-[color:var(--border)] pt-3">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-[color:var(--muted)]">Dashboard</Link>
                  <Link to="/profile" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-[color:var(--muted)]">Profile</Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-[color:var(--muted)]">Admin</Link>
                  )}
                  <button onClick={() => { setOpen(false); signOut(); }} className="rounded-md px-3 py-2 text-left text-sm hover:bg-[color:var(--muted)]">Sign out</button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm" className="rounded-full"><Link to="/auth" onClick={() => setOpen(false)}>Sign in</Link></Button>
                  <Button asChild size="sm" className="rounded-full"><Link to="/auth" search={{ mode: "register" }} onClick={() => setOpen(false)}>Start your book</Link></Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
