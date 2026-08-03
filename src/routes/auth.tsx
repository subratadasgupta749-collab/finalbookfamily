import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookHeart, Loader2 } from "lucide-react";

const authSearchSchema = z.object({
  mode: z.enum(["login", "register", "forgot"]).optional().default("login"),
  ref: z.string().optional(),
});

const REF_STORAGE_KEY = "mfhb.referral_code";

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — My Family History Book" },
      { name: "description", content: "Sign in or create your account to start your family history book." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(128);
const nameSchema = z.string().trim().min(1, "Required").max(100);

function AuthPage() {
  const { mode, ref } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Persist referral code across the OAuth redirect
  useEffect(() => {
    if (ref && typeof window !== "undefined") {
      try { sessionStorage.setItem(REF_STORAGE_KEY, ref); } catch { /* ignore */ }
    }
  }, [ref]);

  useEffect(() => {
    if (loading || !user) return;
    // Attempt to attach a referral captured before OAuth. Dedupes server-side.
    try {
      const ref = typeof window !== "undefined" ? sessionStorage.getItem(REF_STORAGE_KEY) : null;
      if (ref) {
        import("@/lib/referrals.functions").then(({ attachReferralOnSignup }) =>
          attachReferralOnSignup({ data: { code: ref } }).catch(() => {}),
        );
        try { sessionStorage.removeItem(REF_STORAGE_KEY); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">

      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <BookHeart className="h-5 w-5 text-primary" />
          My Family History Book
        </Link>
        <div className="rounded-2xl border border-border/60 bg-background p-8 shadow-sm">
          {mode === "forgot" ? (
            <ForgotForm />
          ) : mode === "register" ? (
            <RegisterForm />
          ) : (
            <LoginForm />
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) {
      toast.error(error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
  };
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick} disabled={busy}>
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
      )}
      {label}
    </Button>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = z.object({ email: emailSchema, password: z.string().min(1, "Required") }).safeParse({ email, password });
    if (!p.success) {
      toast.error(p.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: p.data.email, password: p.data.password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to continue your family history book.</p>
      <div className="mt-6">
        <GoogleButton label="Continue with Google" />
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        OR
        <div className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/auth" search={{ mode: "forgot" }} className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/auth" search={{ mode: "register" }} className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}

function RegisterForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema }).safeParse({ name, email, password });
    if (!p.success) {
      toast.error(p.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: p.data.email,
      password: p.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: p.data.name },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);

    // Best-effort post-signup automation. If email confirm is required,
    // the user isn't authenticated yet — the calls will simply no-op.
    try {
      const { sendWelcomeEmail } = await import("@/lib/onboarding.functions");
      await sendWelcomeEmail();
    } catch { /* ignore */ }

    try {
      const ref = typeof window !== "undefined" ? sessionStorage.getItem(REF_STORAGE_KEY) : null;
      if (ref) {
        const { attachReferralOnSignup } = await import("@/lib/referrals.functions");
        await attachReferralOnSignup({ data: { code: ref } });
        try { sessionStorage.removeItem(REF_STORAGE_KEY); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }

    toast.success("Account created. Check your email if confirmation is required.");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Start preserving your family's story today.</p>
      <div className="mt-6">
        <GoogleButton label="Sign up with Google" />
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        OR
        <div className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/auth" search={{ mode: "login" }} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = emailSchema.safeParse(email);
    if (!p.success) return toast.error(p.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(p.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Password reset email sent");
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We'll email you a secure link to set a new password.
      </p>
      {sent ? (
        <div className="mt-6 rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
          If an account exists for <strong className="text-foreground">{email}</strong>, a reset link is on the way.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send reset link
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/auth" search={{ mode: "login" }} className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
