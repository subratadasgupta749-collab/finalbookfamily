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

    const paths = (rows ?? []).map((r: any) => r.storage_path);
    let urlMap = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed, error: sErr } = await context.supabase.storage
        .from("photos")
        .createSignedUrls(paths, 60 * 60);
      if (sErr) throw new Error(sErr.message);
      urlMap = new Map(
        (signed ?? []).map((s: any) => [s.path as string, s.signedUrl as string]),
      );
    }

    return (rows ?? []).map((r: any) => ({
      ...r,
      url: urlMap.get(r.storage_path) ?? null,
    }));
  });

export const createUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { bookId: string; category: PhotoCategory; ext: string }) =>
      z
        .object({
          bookId: z.string().uuid(),
          category: categoryEnum,
          ext: z.string().min(1).max(8),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureBookOwner(context.supabase, context.userId, data.bookId);

    const ext = data.ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const id = crypto.randomUUID();
    const path = `${context.userId}/${data.bookId}/${id}.${ext}`;

    const { data: signed, error } = await context.supabase.storage
      .from("photos")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);

    return { path, token: signed.token, signedUrl: signed.signedUrl };
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

    // Path must belong to this user
    if (!data.storagePath.startsWith(`${context.userId}/${data.bookId}/`)) {
      throw new Error("Invalid path");
    }

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

    const { error: sErr } = await context.supabase.storage
      .from("photos")
      .remove([photo.storage_path]);
    if (sErr) throw new Error(sErr.message);

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

    if (!data.storagePath.startsWith(`${context.userId}/${existing.book_id}/`)) {
      throw new Error("Invalid path");
    }

    // Delete old file
    if (existing.storage_path && existing.storage_path !== data.storagePath) {
      await context.supabase.storage.from("photos").remove([existing.storage_path]);
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
