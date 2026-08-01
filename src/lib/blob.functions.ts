import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { put, del } from "@vercel/blob";

export const uploadBlobFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: FormData }) => {
    const file = data.get("file") as File | null;
    const prefix = (data.get("prefix") as string) || "uploads";
    
    if (!file) {
      throw new Error("No file provided");
    }

    const path = `${prefix}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const blob = await put(path, file, { access: "public" });
    
    return { url: blob.url };
  });

export const deleteBlobFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: { url: string } }) => {
    if (!data.url) throw new Error("No URL provided");
    
    // Only attempt deletion if it's a vercel blob URL to avoid crashing on legacy Supabase URLs
    if (data.url.includes("public.blob.vercel-storage.com")) {
      await del(data.url);
    }
    
    return { ok: true };
  });
