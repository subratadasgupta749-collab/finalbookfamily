import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { ImageUploadField } from "@/components/image-upload-field";

export const Route = createFileRoute("/_authenticated/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — My Family History Book" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      setFullName(data?.full_name ?? "");
      setAvatarUrl(data?.avatar_url ?? "");
      setLoading(false);
    });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const p = z.object({
      full_name: z.string().trim().min(1, "Name is required").max(100),
      avatar_url: z.string().trim().max(500),
    }).safeParse({ full_name: fullName, avatar_url: avatarUrl });
    if (!p.success) return toast.error(p.error.issues[0].message);

    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: p.data.full_name,
      avatar_url: p.data.avatar_url || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
      <p className="mt-2 text-muted-foreground">Update how you appear across your family history book.</p>

      <form onSubmit={save} className="mt-8 space-y-5 rounded-2xl border border-border/60 bg-background p-6">
        <div>
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} maxLength={100} />
        </div>
        <div>
          <Label htmlFor="avatar_url">Avatar (optional)</Label>
          <div className="mt-1">
            <ImageUploadField value={avatarUrl} onChange={setAvatarUrl} folder="avatars" disabled={loading} placeholder="https://… or upload an avatar" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || loading}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
