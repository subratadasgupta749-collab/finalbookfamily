import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Save, Upload, Loader2 } from "lucide-react";
import { adminGetPost, createPost, updatePost, BLOG_CATEGORY, type BlogPostInput } from "@/lib/blog.functions";
import { slugify } from "@/lib/slugify";
import { supabase } from "@/integrations/supabase/client";

type FAQ = { q: string; a: string };

type Props = { mode: "create" } | { mode: "edit"; postId: string };

export function PostEditor(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(props.mode === "edit");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [featured, setFeatured] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [faq, setFaq] = useState<FAQ[]>([]);
  const [published, setPublished] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (error) throw error;
      setFeatured(`/api/public/blog-images/${path}`);
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  useEffect(() => {
    if (props.mode !== "edit") return;
    (async () => {
      try {
        const p = await adminGetPost({ data: { id: props.postId } });
        setTitle(p.title); setSlug(p.slug); setSlugTouched(true);
        setExcerpt(p.excerpt ?? ""); setContent(p.content ?? "");
        setFeatured(p.featured_image_url ?? "");
        setMetaTitle(p.meta_title ?? ""); setMetaDesc(p.meta_description ?? "");
        setFaq(Array.isArray(p.faq) ? (p.faq as FAQ[]) : []);
        setPublished(!!p.published);
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const onTitle = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: BlogPostInput = {
        title, slug, excerpt: excerpt || null, content,
        featured_image_url: featured || null,
        meta_title: metaTitle || null, meta_description: metaDesc || null,
        faq: faq.filter((f) => f.q.trim() && f.a.trim()),
        published,
      };
      if (props.mode === "create") {
        const p = await createPost({ data: payload });
        toast.success("Post created");
        router.navigate({ to: "/admin/blog/$postId", params: { postId: p.id } });
      } else {
        await updatePost({ data: { ...payload, id: props.postId } });
        toast.success("Post saved");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.navigate({ to: "/admin/blog" })}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={published} onCheckedChange={setPublished} id="pub" />
            <Label htmlFor="pub">{published ? "Published" : "Draft"}</Label>
          </div>
          <Button onClick={save} disabled={saving || !title || !slug}>
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Post title" />
        </div>
        <div>
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} placeholder="post-slug" />
        </div>
        <div>
          <Label>Category</Label>
          <Input value={BLOG_CATEGORY} disabled />
        </div>
        <div>
          <Label>Excerpt</Label>
          <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="Short summary" />
        </div>
        <div>
          <Label>Featured Image</Label>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
            />
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? "Uploading…" : "Upload image"}
            </Button>
            {featured && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setFeatured("")}>Remove</Button>
            )}
          </div>
          <Input value={featured} onChange={(e) => setFeatured(e.target.value)} placeholder="…or paste image URL" className="mt-2" />
          {featured && <img src={featured} alt="" className="mt-2 h-40 rounded-md object-cover" />}
        </div>
      </Card>

      <Card className="p-6 space-y-2">
        <Label>Content (HTML supported)</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={18}
          className="font-mono text-sm" placeholder="Write your post…" />
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">SEO</h3>
        <div>
          <Label>Meta Title</Label>
          <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70} />
        </div>
        <div>
          <Label>Meta Description</Label>
          <Textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={2} maxLength={200} />
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">FAQ</h3>
          <Button size="sm" variant="outline" onClick={() => setFaq([...faq, { q: "", a: "" }])}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {faq.map((f, i) => (
          <div key={i} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Input value={f.q} onChange={(e) => setFaq(faq.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} placeholder="Question" />
              <Button size="icon" variant="ghost" onClick={() => setFaq(faq.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Textarea value={f.a} onChange={(e) => setFaq(faq.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} placeholder="Answer" rows={2} />
          </div>
        ))}
      </Card>
    </div>
  );
}
