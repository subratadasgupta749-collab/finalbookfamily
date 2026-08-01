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
    const blobFile = new File([stableBytes.buffer], filename, { type: contentType });

    const { put } = await import("@vercel/blob");
    const blob = await put(`exports/${path}`, blobFile, { access: "public" });

    const { data: row, error: insErr } = await context.supabase
      .from("book_exports")
      .insert({
        book_id: data.bookId,
        user_id: context.userId,
        kind: data.kind,
        storage_path: blob.url,
        filename,
        size_bytes: blobFile.size,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    return { ...row, url: blob.url };
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

    // For backwards compatibility, if the storage_path is not a full URL, it might be a legacy Supabase path.
    // In that case we won't show it or we can just leave it as is (it will fail to load).
    // For Vercel Blob, storage_path is the full URL.
    return (rows ?? []).map((r: any) => ({ ...r, url: r.storage_path }));
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
    
    if (row.storage_path.includes("public.blob.vercel-storage.com")) {
      const { del } = await import("@vercel/blob");
      await del(row.storage_path);
    }
    
    const { error } = await context.supabase.from("book_exports").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
