import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Moon, Sun, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Panel } from "@/components/dashboard/primitives";
import { deleteMyAccount } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/_app/settings")({
  head: () => ({
    meta: [{ title: "Settings — My Family History Book" }, { name: "robots", content: "noindex" }],
  }),
  component: SettingsPage,
});

type Prefs = { emailUpdates: boolean; interviewReminders: boolean; productNews: boolean };
const PREF_KEY = "fhb:notification-prefs";
const LANG_KEY = "fhb:language";
const THEME_KEY = "fhb:theme";

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { general } = useSettings();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState("en");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [prefs, setPrefs] = useState<Prefs>({
    emailUpdates: true,
    interviewReminders: true,
    productNews: false,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    try {
      const p = localStorage.getItem(PREF_KEY);
      if (p) setPrefs((s) => ({ ...s, ...JSON.parse(p) }));
      setLang(localStorage.getItem(LANG_KEY) ?? general?.default_language ?? "en");
      const t = (localStorage.getItem(THEME_KEY) as "light" | "dark") ?? "light";
      setTheme(t);
      document.documentElement.classList.toggle("dark", t === "dark");
    } catch {
      /* ignore */
    }
  }, [general?.default_language]);

  const savePrefs = (next: Prefs) => {
    setPrefs(next);
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
    toast.success("Notification preferences saved");
  };

  const applyTheme = (t: "light" | "dark") => {
    setTheme(t);
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.classList.toggle("dark", t === "dark");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().min(8, "Password must be at least 8 characters").safeParse(password);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPassword("");
    setConfirm("");
    toast.success("Password updated");
  };

  const removeAccount = async () => {
    if (!confirm0()) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      toast.success("Account deleted");
      await signOut();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const languages = general?.available_languages?.length
    ? general.available_languages
    : ["en"];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account, security and preferences.</p>
      </div>

      <Panel title="Profile" description={user?.email ?? undefined}>
        <p className="text-sm text-muted-foreground">
          Update your name and profile photo on the profile page.
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link to="/profile">Edit profile</Link>
        </Button>
      </Panel>

      <Panel title="Password">
        <form onSubmit={changePassword} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pw">New password</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Confirm password</Label>
              <Input
                id="pw2"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <Button type="submit" disabled={busy || !password}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
          </Button>
        </form>
      </Panel>

      <Panel title="Language">
        <select
          value={lang}
          onChange={(e) => {
            setLang(e.target.value);
            localStorage.setItem(LANG_KEY, e.target.value);
            toast.success("Language preference saved");
          }}
          className="w-full max-w-xs rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
        >
          {languages.map((l: string) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </Panel>

      <Panel title="Notification preferences">
        <div className="space-y-4">
          <PrefRow
            label="Email updates"
            description="Order confirmations and book-ready emails."
            checked={prefs.emailUpdates}
            onChange={(v) => savePrefs({ ...prefs, emailUpdates: v })}
          />
          <PrefRow
            label="Interview reminders"
            description="Nudges to finish an in-progress book."
            checked={prefs.interviewReminders}
            onChange={(v) => savePrefs({ ...prefs, interviewReminders: v })}
          />
          <PrefRow
            label="Product news"
            description="Occasional announcements about new features."
            checked={prefs.productNews}
            onChange={(v) => savePrefs({ ...prefs, productNews: v })}
          />
        </div>
      </Panel>

      <Panel title="Theme">
        <div className="flex gap-3">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            size="sm"
            onClick={() => applyTheme("light")}
          >
            <Sun className="mr-1.5 h-4 w-4" /> Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            size="sm"
            onClick={() => applyTheme("dark")}
          >
            <Moon className="mr-1.5 h-4 w-4" /> Dark
          </Button>
        </div>
      </Panel>

      <Panel title="Delete account" className="border-destructive/40">
        <p className="text-sm text-muted-foreground">
          This permanently removes your account, books and files. This cannot be undone.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-4"
          onClick={removeAccount}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Delete my account
        </Button>
      </Panel>
    </div>
  );
}

function confirm0() {
  return window.confirm("Delete your account permanently? This cannot be undone.");
}

function PrefRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
