import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { listPublishedPosts } from "@/lib/blog.functions";
import { SiteLayout } from "@/components/site-layout";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Family History Book Blog — Stories, Tips & Guides" },
      { name: "description", content: "Guides, tips and inspiring stories about writing and preserving your family history." },
      { property: "og:title", content: "Family History Book Blog" },
      { property: "og:description", content: "Stories, tips and guides for capturing your family's legacy." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
});

function BlogIndex() {
  const { q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ ?? "");
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof listPublishedPosts>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setQ(initialQ ?? ""); }, [initialQ]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try { setPosts(await listPublishedPosts({ data: { q } })); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">Blog</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Family History Book Blog</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Stories, tips and guides for capturing your family's legacy.
          </p>
        </div>

        <div className="relative mx-auto mb-10 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles…" className="pl-9" />
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No posts yet. Check back soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="group">
                <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
                  {p.featured_image_url && (
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <img src={p.featured_image_url} alt={p.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </div>
                  )}
                  <div className="p-5">
                    <p className="mb-2 text-xs uppercase tracking-wider text-primary">{p.category}</p>
                    <h2 className="font-serif text-xl font-semibold leading-snug">{p.title}</h2>
                    {p.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>}
                    {p.published_at && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {new Date(p.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
