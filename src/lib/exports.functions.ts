import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExportKind = "pdf" | "docx" | "print_pdf";

const designSchema = z
  .object({
    paper: z.string().optional(),
    ink: z.string().optional(),
    muted: z.string().optional(),
    accent: z.string().optional(),
    rule: z.string().optional(),
    accentSoft: z.string().optional(),
    background: z.string().optional(),
    pageWidthMm: z.number().optional(),
    pageHeightMm: z.number().optional(),
    marginMm: z.number().optional(),
    displayFont: z.string().optional(),
    bodyFont: z.string().optional(),
    showFooter: z.boolean().optional(),
    dedication: z.string().optional(),
    familyQuote: z.string().optional(),
    thankYou: z.string().optional(),
    templateLabel: z.string().optional(),
    templateId: z.string().optional(),
    coverStyle: z.string().optional(),
    openerStyle: z.string().optional(),
    photoLayout: z.string().optional(),
    timelineStyle: z.string().optional(),
    quoteStyle: z.string().optional(),
    dividerStyle: z.string().optional(),
    deep: z.string().optional(),
    coverInk: z.string().optional(),
    dropCap: z.string().optional(),
    uppercaseLabels: z.boolean().optional(),
    bodySize: z.string().optional(),
    bodyLeading: z.string().optional(),
    showHeader: z.boolean().optional(),
    coverPhotoId: z.string().optional(),
  })
  .optional();

export type ExportDesignInput = z.infer<typeof designSchema>;

export const generateExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bookId: string; kind: ExportKind; design?: ExportDesignInput }) =>
    z
      .object({
        bookId: z.string().uuid(),
        kind: z.enum(["pdf", "docx", "print_pdf"]),
        design: designSchema,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { loadBookData, buildPdf, buildDocx, slugify, assertValidPdfBytes } = await import("./exports.server");

    const loaded = await loadBookData(context.supabase, data.bookId);
    if (loaded.book.user_id !== context.userId) throw new Error("Not authorized");

    if ((loaded.chapters?.length ?? 0) === 0) {
      throw new Error("Generate the manuscript first before exporting.");
    }

    let bytes: Uint8Array;
    let ext: string;
    let contentType: string;
    let suffix: string;
    if (data.kind === "pdf") {
      bytes = await buildPdf(loaded, false, data.design ?? {});
      assertValidPdfBytes(bytes);
      ext = "pdf";
      contentType = "application/pdf";
      suffix = "";
    } else if (data.kind === "print_pdf") {
      bytes = await buildPdf(loaded, true, data.design ?? {});
      assertValidPdfBytes(bytes);
      ext = "pdf";
      contentType = "application/pdf";
      suffix = "-print-ready";
    } else {
      bytes = await buildDocx(loaded, data.design ?? {});
      ext = "docx";
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      suffix = "";
    }

    const base = slugify(loaded.book.name);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${base}${suffix}-${stamp}.${ext}`;
    const path = `${context.userId}/${data.bookId}/${filename}`;
    const stableBytes: Uint8Array<ArrayBuffer> = new Uint8Array(bytes.byteLength);
    stableBytes.set(bytes);
    const uploadBody = new Blob([stableBytes.buffer], { type: contentType });

    const { error: upErr } = await context.supabase.storage
      .from("book-exports")
      .upload(path, uploadBody, { contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { data: row, error: insErr } = await context.supabase
      .from("book_exports")
      .insert({
        book_id: data.bookId,
        user_id: context.userId,
        kind: data.kind,
        storage_path: path,
        filename,
        size_bytes: uploadBody.size,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    const { data: signed, error: signErr } = await context.supabase.storage
      .from("book-exports")
      .createSignedUrl(path, 60 * 60);
    if (signErr) throw new Error(signErr.message);

    return { ...row, url: signed?.signedUrl ?? null };
  });

export const listExports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bookId: string }) =>
    z.object({ bookId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("book_exports")
      .select("*")
      .eq("book_id", data.bookId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const paths = (rows ?? []).map((r: any) => r.storage_path);
    let urlMap = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed, error: sErr } = await context.supabase.storage
        .from("book-exports")
        .createSignedUrls(paths, 60 * 60);
      if (sErr) throw new Error(sErr.message);
      urlMap = new Map(
        (signed ?? []).map((s: any) => [s.path as string, s.signedUrl as string]),
      );
    }
    return (rows ?? []).map((r: any) => ({ ...r, url: urlMap.get(r.storage_path) ?? null }));
  });

export const deleteExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error: fErr } = await context.supabase
      .from("book_exports")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!row) return { ok: true, alreadyDeleted: true };
    await context.supabase.storage.from("book-exports").remove([row.storage_path]);
    const { error } = await context.supabase.from("book_exports").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
