import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DbBookTheme = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  is_default: boolean;
  display_order: number;
  cover_design: string;
  typography_name: string | null;
  fonts: { display: string; body: string; script: string };
  color_palette: {
    paper: string;
    ink: string;
    muted: string;
    accent: string;
    accentSoft: string;
    rule: string;
    deep: string;
    coverInk: string;
  };
  background_style: string;
  background_name: string;
  header_style: string;
  footer_style: string;
  chapter_style: string;
  timeline_style: string;
  photo_layout: string;
  quote_style: string;
  divider_style: string;
  page_number_style: string;
  toc_style: string;
  cover_layout: string;
  back_cover_layout: string;
  print_settings: Record<string, any>;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  preview_images?: Array<{ id: string; image_url: string; caption: string | null; display_order: number }>;
};

const themeInputSchema = z.object({
  slug: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().optional().nullable(),
  is_enabled: z.boolean().default(true),
  is_default: z.boolean().default(false),
  display_order: z.number().default(0),
  cover_design: z.string().default("plate"),
  typography_name: z.string().optional().nullable(),
  fonts: z.object({
    display: z.string(),
    body: z.string(),
    script: z.string(),
  }),
  color_palette: z.object({
    paper: z.string(),
    ink: z.string(),
    muted: z.string(),
    accent: z.string(),
    accentSoft: z.string(),
    rule: z.string(),
    deep: z.string(),
    coverInk: z.string(),
  }),
  background_style: z.string().default("none"),
  background_name: z.string().default("Plain white"),
  header_style: z.string().default("standard"),
  footer_style: z.string().default("standard"),
  chapter_style: z.string().default("numeral"),
  timeline_style: z.string().default("vertical"),
  photo_layout: z.string().default("rounded"),
  quote_style: z.string().default("center"),
  divider_style: z.string().default("ornament"),
  page_number_style: z.string().default("bottom-center"),
  toc_style: z.string().default("classic"),
  cover_layout: z.string().default("standard"),
  back_cover_layout: z.string().default("standard"),
  print_settings: z.record(z.any()).default({}),
  cover_image_url: z.string().optional().nullable(),
});

/**
 * Fetch enabled themes for user application
 */
export const getAvailableThemes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const { data: themes, error } = await supabase
      .from("book_themes")
      .select("*, theme_preview_images(id, image_url, caption, display_order)")
      .eq("is_enabled", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching book themes:", error);
      return [];
    }
    return (themes ?? []) as DbBookTheme[];
  });

/**
 * Fetch system default theme
 */
export const getDefaultTheme = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const { data, error } = await supabase
      .from("book_themes")
      .select("*, theme_preview_images(id, image_url, caption, display_order)")
      .eq("is_default", true)
      .maybeSingle();

    if (error || !data) {
      // Fallback to first enabled theme
      const { data: fallback } = await supabase
        .from("book_themes")
        .select("*, theme_preview_images(id, image_url, caption, display_order)")
        .eq("is_enabled", true)
        .order("display_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      return fallback as DbBookTheme | null;
    }
    return data as DbBookTheme;
  });

/**
 * Admin: List all themes (enabled and disabled)
 */
export const adminListThemes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const { data: themes, error } = await supabase
      .from("book_themes")
      .select("*, theme_preview_images(id, image_url, caption, display_order)")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return (themes ?? []) as DbBookTheme[];
  });

/**
 * Admin: Create new theme
 */
export const adminCreateTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => themeInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    if (data.is_default) {
      // Unset previous default
      await supabase
        .from("book_themes")
        .update({ is_default: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");
    }

    const { data: created, error } = await supabase
      .from("book_themes")
      .insert({
        slug: data.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "_"),
        name: data.name,
        description: data.description,
        is_enabled: data.is_enabled,
        is_default: data.is_default,
        display_order: data.display_order,
        cover_design: data.cover_design,
        typography_name: data.typography_name,
        fonts: data.fonts,
        color_palette: data.color_palette,
        background_style: data.background_style,
        background_name: data.background_name,
        header_style: data.header_style,
        footer_style: data.footer_style,
        chapter_style: data.chapter_style,
        timeline_style: data.timeline_style,
        photo_layout: data.photo_layout,
        quote_style: data.quote_style,
        divider_style: data.divider_style,
        page_number_style: data.page_number_style,
        toc_style: data.toc_style,
        cover_layout: data.cover_layout,
        back_cover_layout: data.back_cover_layout,
        print_settings: data.print_settings,
        cover_image_url: data.cover_image_url,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created as DbBookTheme;
  });

/**
 * Admin: Update existing theme
 */
export const adminUpdateTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; theme: any }) =>
    z
      .object({
        id: z.string().uuid(),
        theme: themeInputSchema.partial(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    if (data.theme.is_default) {
      await supabase
        .from("book_themes")
        .update({ is_default: false })
        .neq("id", data.id);
    }

    const updateData: Record<string, any> = { ...data.theme };
    if (updateData.slug) {
      updateData.slug = updateData.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    }

    const { data: updated, error } = await supabase
      .from("book_themes")
      .update(updateData)
      .eq("id", data.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated as DbBookTheme;
  });

/**
 * Admin: Delete theme
 */
export const adminDeleteTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase
      .from("book_themes")
      .delete()
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Admin: Enable/Disable theme
 */
export const adminToggleThemeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; is_enabled: boolean }) =>
    z.object({ id: z.string().uuid(), is_enabled: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase
      .from("book_themes")
      .update({ is_enabled: data.is_enabled })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Admin: Set Default Theme
 */
export const adminSetDefaultTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    // Unset all default flags
    await supabase
      .from("book_themes")
      .update({ is_default: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Set target default and make sure it is enabled
    const { error } = await supabase
      .from("book_themes")
      .update({ is_default: true, is_enabled: true })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Admin: Duplicate Theme
 */
export const adminDuplicateTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: source, error: sErr } = await supabase
      .from("book_themes")
      .select("*")
      .eq("id", data.id)
      .single();

    if (sErr || !source) throw new Error("Source theme not found");

    const newSlug = `${source.slug}_copy_${Date.now().toString().slice(-4)}`;
    const newName = `${source.name} (Copy)`;

    const { id, created_at, updated_at, is_default, ...rest } = source;

    const { data: created, error: cErr } = await supabase
      .from("book_themes")
      .insert({
        ...rest,
        slug: newSlug,
        name: newName,
        is_default: false,
        display_order: (source.display_order ?? 0) + 1,
      })
      .select()
      .single();

    if (cErr) throw new Error(cErr.message);
    return created as DbBookTheme;
  });

/**
 * Admin: Reorder Themes
 */
export const adminReorderThemes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { items: Array<{ id: string; display_order: number }> }) =>
    z
      .object({
        items: z.array(z.object({ id: z.string().uuid(), display_order: z.number() })),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    for (const item of data.items) {
      await supabase
        .from("book_themes")
        .update({ display_order: item.display_order })
        .eq("id", item.id);
    }
    return { ok: true };
  });

/**
 * Admin: Add Preview Image to Theme
 */
export const adminAddPreviewImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { themeId: string; imageUrl: string; caption?: string }) =>
    z
      .object({
        themeId: z.string().uuid(),
        imageUrl: z.string().url(),
        caption: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: inserted, error } = await supabase
      .from("theme_preview_images")
      .insert({
        theme_id: data.themeId,
        image_url: data.imageUrl,
        caption: data.caption,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return inserted;
  });

/**
 * Admin: Delete Preview Image
 */
export const adminDeletePreviewImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { imageId: string }) =>
    z.object({ imageId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase
      .from("theme_preview_images")
      .delete()
      .eq("id", data.imageId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
