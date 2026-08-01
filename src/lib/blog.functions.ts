import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const BLOG_CATEGORY = "Family History Book Blog";

const faqSchema = z.array(
  z.object({ q: z.string().trim().min(1), a: z.string().trim().min(1) }),
);

const postSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9-]+$/, "Slug: lowercase, numbers, hyphens only"),
  excerpt: z.string().trim().max(500).optional().nullable(),
  content: z.string().default(""),
  featured_image_url: z.string().trim().url().optional().nullable().or(z.literal("")),
  meta_title: z.string().trim().max(200).optional().nullable(),
  meta_description: z.string().trim().max(300).optional().nullable(),
  faq: faqSchema.default([]),
  published: z.boolean().default(false),
});

export type BlogPostInput = z.infer<typeof postSchema>;

function serverPublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

/* ------------ Admin ------------ */

export const adminListPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("blog_posts")
      .select("id, title, slug, published, published_at, updated_at, created_at, featured_image_url")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: post, error } = await context.supabase
      .from("blog_posts").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!post) throw new Error("Post not found");
    return post;
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: BlogPostInput) => postSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: post, error } = await context.supabase
      .from("blog_posts")
      .insert({
        author_id: context.userId,
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || null,
        content: data.content,
        featured_image_url: data.featured_image_url || null,
        meta_title: data.meta_title || null,
        meta_description: data.meta_description || null,
        category: BLOG_CATEGORY,
        faq: data.faq,
        published: data.published,
        published_at: data.published ? new Date().toISOString() : null,
      })
      .select().single();
    if (error) throw new Error(error.message);
    return post;
  });

export const updatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: BlogPostInput & { id: string }) =>
    postSchema.extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...f } = data;
    const { data: existing } = await context.supabase
      .from("blog_posts").select("published, published_at").eq("id", id).maybeSingle();
    const published_at =
      f.published && !existing?.published_at ? new Date().toISOString() : existing?.published_at ?? null;
    const { data: post, error } = await context.supabase
      .from("blog_posts")
      .update({
        title: f.title,
        slug: f.slug,
        excerpt: f.excerpt || null,
        content: f.content,
        featured_image_url: f.featured_image_url || null,
        meta_title: f.meta_title || null,
        meta_description: f.meta_description || null,
        faq: f.faq,
        published: f.published,
        published_at: f.published ? published_at : null,
      })
      .eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return post;
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("blog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------ Public ------------ */

export const listPublishedPosts = createServerFn({ method: "GET" })
  .inputValidator((d?: { q?: string }) => z.object({ q: z.string().trim().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = serverPublicClient();
    let query = sb
      .from("blog_posts")
      .select("id, title, slug, excerpt, featured_image_url, published_at, category")
      .eq("published", true)
      .order("published_at", { ascending: false });
    if (data.q) query = query.ilike("title", `%${data.q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPublishedPost = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = serverPublicClient();
    const { data: post, error } = await sb
      .from("blog_posts")
      .select("id, title, slug, excerpt, content, featured_image_url, meta_title, meta_description, faq, category, published_at, author_id")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!post) return null;

    const { data: sameCat } = await sb
      .from("blog_posts")
      .select("id, title, slug, excerpt, featured_image_url, published_at, category")
      .eq("published", true)
      .eq("category", post.category)
      .neq("id", post.id)
      .order("published_at", { ascending: false })
      .limit(3);

    let also = sameCat ?? [];
    if (also.length < 3) {
      const excludeIds = [post.id, ...also.map((p) => p.id)];
      const { data: fill } = await sb
        .from("blog_posts")
        .select("id, title, slug, excerpt, featured_image_url, published_at, category")
        .eq("published", true)
        .not("id", "in", `(${excludeIds.join(",")})`)
        .order("published_at", { ascending: false })
        .limit(3 - also.length);
      also = [...also, ...(fill ?? [])];
    }

    const { data: author } = await sb
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", post.author_id)
      .maybeSingle();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: blogSettingsRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "blog")
      .maybeSingle();

    const blogSettings = (blogSettingsRow?.value ?? {}) as {
      default_author?: string;
      author_image?: string;
      author_bio?: string;
      author_social?: Record<string, string>;
    };

    const rawSocial = blogSettings.author_social ?? {};
    const social: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawSocial)) {
      if (typeof v === "string" && v.trim()) social[k] = v.trim();
    }

    const resolvedAuthor = {
      full_name: blogSettings.default_author?.trim() || author?.full_name || null,
      avatar_url: blogSettings.author_image?.trim() || author?.avatar_url || null,
      bio: blogSettings.author_bio?.trim() || null,
      social,
    };

    return { post, alsoRead: also ?? [], author: resolvedAuthor };
  });

