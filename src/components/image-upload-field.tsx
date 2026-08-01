import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  value: string;
  onChange: (url: string) => void;
  /** Folder inside the bucket, e.g. "avatars", "settings", "blog". */
  folder?: string;
  /** Max file size in MB (default 8). */
  maxMb?: number;
  /** Show preview thumbnail. */
  preview?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Reusable image uploader with URL input fallback.
 * Uploads to the `blog-images` bucket (proxied publicly via /api/public/blog-images/*)
 * and writes the resulting URL back through onChange.
 */
export function ImageUploadField({
  value,
  onChange,
  folder = "uploads",
  maxMb = 8,
  preview = true,
  disabled,
  placeholder = "https://… or upload an image",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Image must be under ${maxMb}MB`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("blog-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      onChange(`/api/public/blog-images/${path}`);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {uploading ? "Uploading…" : value ? "Change image" : "Upload image"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => onChange("")}
          >
            <X className="mr-1 h-4 w-4" /> Remove
          </Button>
        )}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || uploading}
      />
      {preview && value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="h-24 w-auto rounded-md border border-border object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </div>
  );
}
