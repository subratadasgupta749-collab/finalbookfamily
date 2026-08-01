import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PHOTO_CATEGORIES = [
  "baby",
  "school",
  "wedding",
  "career",
  "family",
  "retirement",
] as const;

export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

const categoryEnum = z.enum(PHOTO_CATEGORIES);

async function ensureBookOwner(
  supabase: any,
  userId: string,
  bookId: string,
) {
  const { data, error } = await supabase
    .from("books")
    .select("id")
    .eq("id", bookId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Book not found");
}

export const listPhotos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bookId: string }) =>
    z.object({ bookId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureBookOwner(context.supabase, context.userId, data.bookId);

    const { data: rows, error } = await context.supabase
      .from("photos")
      .select("*")
      .eq("book_id", data.bookId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // For Vercel Blob, the storage_path is the absolute public URL.
    // For legacy Supabase paths, it won't load properly without signed URL logic, 
    // but the system is migrating to Blob.
    return (rows ?? []).map((r: any) => ({
      ...r,
      url: r.storage_path,
    }));
  });



export const confirmPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      bookId: string;
      category: PhotoCategory;
      storagePath: string;
      filename: string;
      sizeBytes?: number;
      width?: number;
      height?: number;
      mimeType?: string;
    }) =>
      z
        .object({
          bookId: z.string().uuid(),
          category: categoryEnum,
          storagePath: z.string().min(1),
          filename: z.string().trim().min(1).max(255),
          sizeBytes: z.number().int().nonnegative().optional(),
          width: z.number().int().positive().optional(),
          height: z.number().int().positive().optional(),
          mimeType: z.string().max(80).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureBookOwner(context.supabase, context.userId, data.bookId);

    // Path validation removed because it's now an absolute Vercel Blob URL

    const { data: row, error } = await context.supabase
      .from("photos")
      .insert({
        user_id: context.userId,
        book_id: data.bookId,
        category: data.category,
        storage_path: data.storagePath,
        filename: data.filename,
        size_bytes: data.sizeBytes ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        mime_type: data.mimeType ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const renamePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; filename: string }) =>
    z
      .object({
        id: z.string().uuid(),
        filename: z.string().trim().min(1).max(255),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("photos")
      .update({ filename: data.filename })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: photo, error: fErr } = await context.supabase
      .from("photos")
      .select("storage_path, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!photo) throw new Error("Photo not found");

    if (photo.storage_path && photo.storage_path.includes("public.blob.vercel-storage.com")) {
      const { del } = await import("@vercel/blob");
      await del(photo.storage_path);
    }

    const { error } = await context.supabase.from("photos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const replacePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      storagePath: string;
      filename: string;
      sizeBytes?: number;
      width?: number;
      height?: number;
      mimeType?: string;
    }) =>
      z
        .object({
          id: z.string().uuid(),
          storagePath: z.string().min(1),
          filename: z.string().trim().min(1).max(255),
          sizeBytes: z.number().int().nonnegative().optional(),
          width: z.number().int().positive().optional(),
          height: z.number().int().positive().optional(),
          mimeType: z.string().max(80).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error: fErr } = await context.supabase
      .from("photos")
      .select("storage_path, user_id, book_id")
      .eq("id", data.id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!existing) throw new Error("Photo not found");

    // Path validation removed since it's an absolute URL

    // Delete old file
    if (
      existing.storage_path &&
      existing.storage_path !== data.storagePath &&
      existing.storage_path.includes("public.blob.vercel-storage.com")
    ) {
      const { del } = await import("@vercel/blob");
      await del(existing.storage_path);
    }

    const { data: row, error } = await context.supabase
      .from("photos")
      .update({
        storage_path: data.storagePath,
        filename: data.filename,
        size_bytes: data.sizeBytes ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        mime_type: data.mimeType ?? null,
      })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
