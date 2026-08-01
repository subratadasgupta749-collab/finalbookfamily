import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const bookInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  nickname: z.string().trim().max(100).optional().nullable(),
  gender: z.string().trim().max(50).optional().nullable(),
  date_of_birth: z.string().trim().optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  relationship: z.string().trim().max(100).optional().nullable(),
});

export type BookInput = z.infer<typeof bookInputSchema>;

export const listBooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("books")
      .select("id, name, nickname, relationship, status, progress, updated_at, created_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getBook = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: book, error } = await context.supabase
      .from("books")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!book) throw new Error("Book not found");
    return book;
  });

export const createBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: BookInput) => bookInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: book, error } = await context.supabase
      .from("books")
      .insert({
        user_id: context.userId,
        name: data.name,
        nickname: data.nickname || null,
        gender: data.gender || null,
        date_of_birth: data.date_of_birth || null,
        country: data.country || null,
        relationship: data.relationship || null,
        status: "draft",
        progress: 10,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return book;
  });

export const updateBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: BookInput & { id: string }) =>
    bookInputSchema.extend({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const { data: book, error } = await context.supabase
      .from("books")
      .update({
        name: fields.name,
        nickname: fields.nickname || null,
        gender: fields.gender || null,
        date_of_birth: fields.date_of_birth || null,
        country: fields.country || null,
        relationship: fields.relationship || null,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return book;
  });

export const deleteBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("books").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: original, error: fetchErr } = await context.supabase
      .from("books")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!original) throw new Error("Book not found");

    const { data: copy, error } = await context.supabase
      .from("books")
      .insert({
        user_id: context.userId,
        name: `${original.name} (Copy)`,
        nickname: original.nickname,
        gender: original.gender,
        date_of_birth: original.date_of_birth,
        country: original.country,
        relationship: original.relationship,
        status: "draft",
        progress: original.progress,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return copy;
  });
