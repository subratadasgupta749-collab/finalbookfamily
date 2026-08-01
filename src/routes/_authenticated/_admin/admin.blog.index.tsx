import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminListPosts, deletePost } from "@/lib/blog.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/_admin/admin/blog/")({
  component: BlogAdmin,
});

function BlogAdmin() {
  const router = useRouter();
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof adminListPosts>>>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setPosts(await adminListPosts()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = posts.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()));

  const handleDelete = async (id: string) => {
    try {
      await deletePost({ data: { id } });
      toast.success("Post deleted");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Blog</h1>
          <p className="text-sm text-muted-foreground">Family History Book Blog — {posts.length} posts</p>
        </div>
        <Button asChild><Link to="/admin/blog/new"><Plus className="h-4 w-4 mr-2" /> New Post</Link></Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts…" className="pl-9" />
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No posts yet.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Card key={p.id} className="flex items-center gap-4 p-4">
              {p.featured_image_url && (
                <img src={p.featured_image_url} alt="" className="h-14 w-20 rounded object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{p.title}</span>
                  {p.published
                    ? <Badge variant="default">Published</Badge>
                    : <Badge variant="secondary">Draft</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">/{p.slug} · Updated {new Date(p.updated_at).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-1">
                {p.published && (
                  <Button asChild size="sm" variant="ghost">
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => router.navigate({ to: "/admin/blog/$postId", params: { postId: p.id } })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(p.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
