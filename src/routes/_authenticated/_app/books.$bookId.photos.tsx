import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Upload, Trash2, Pencil, RefreshCw, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";
import {
  PHOTO_CATEGORIES,
  type PhotoCategory,
  listPhotos,
  createUploadUrl,
  confirmPhoto,
  deletePhoto,
  renamePhoto,
  replacePhoto,
} from "@/lib/photos.functions";

const photosQueryOptions = (bookId: string) =>
  queryOptions({
    queryKey: ["photos", bookId],
    queryFn: () => listPhotos({ data: { bookId } }),
  });

export const Route = createFileRoute("/_authenticated/_app/books/$bookId/photos")({
  head: () => ({
    meta: [
      { title: "Photos — My Family History Book" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PhotosPage,
});

const CATEGORY_LABEL: Record<PhotoCategory, string> = {
  baby: "Baby",
  school: "School",
  wedding: "Wedding",
  career: "Career",
  family: "Family",
  retirement: "Retirement",
};

type PhotoRow = {
  id: string;
  category: PhotoCategory;
  storage_path: string;
  filename: string;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  mime_type: string | null;
  url: string | null;
  created_at: string;
};

function PhotosPage() {
  const { bookId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeCat, setActiveCat] = useState<PhotoCategory>("family");
  const [renaming, setRenaming] = useState<PhotoRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PhotoRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const { data: photos = [], isLoading } = useQuery(photosQueryOptions(bookId));

  const createUrlFn = useServerFn(createUploadUrl);
  const confirmFn = useServerFn(confirmPhoto);
  const deleteFn = useServerFn(deletePhoto);
  const renameFn = useServerFn(renamePhoto);
  const replaceFn = useServerFn(replacePhoto);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["photos", bookId] });
    router.invalidate();
  };

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Photo deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMut = useMutation({
    mutationFn: (v: { id: string; filename: string }) => renameFn({ data: v }),
    onSuccess: () => {
      toast.success("Renamed");
      setRenaming(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleUploadFiles(files: FileList, category: PhotoCategory) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: not an image`);
          continue;
        }
        try {
          const compressed = await compressImage(file);
          const { path, token } = await createUrlFn({
            data: { bookId, category, ext: compressed.ext },
          });
          const { error: upErr } = await supabase.storage
            .from("photos")
            .uploadToSignedUrl(path, token, compressed.blob, {
              contentType: compressed.mimeType,
            });
          if (upErr) throw new Error(upErr.message);

          await confirmFn({
            data: {
              bookId,
              category,
              storagePath: path,
              filename: file.name,
              sizeBytes: compressed.sizeBytes,
              width: compressed.width,
              height: compressed.height,
              mimeType: compressed.mimeType,
            },
          });
        } catch (e) {
          toast.error(`${file.name}: ${(e as Error).message}`);
        }
      }
      toast.success("Upload complete");
      invalidate();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleReplaceFile(file: File, photo: PhotoRow) {
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const { path, token } = await createUrlFn({
        data: { bookId, category: photo.category, ext: compressed.ext },
      });
      const { error: upErr } = await supabase.storage
        .from("photos")
        .uploadToSignedUrl(path, token, compressed.blob, {
          contentType: compressed.mimeType,
        });
      if (upErr) throw new Error(upErr.message);
      await replaceFn({
        data: {
          id: photo.id,
          storagePath: path,
          filename: file.name,
          sizeBytes: compressed.sizeBytes,
          width: compressed.width,
          height: compressed.height,
          mimeType: compressed.mimeType,
        },
      });
      toast.success("Photo replaced");
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      setReplacingId(null);
      if (replaceRef.current) replaceRef.current.value = "";
    }
  }

  const grouped: Record<PhotoCategory, PhotoRow[]> = {
    baby: [],
    school: [],
    wedding: [],
    career: [],
    family: [],
    retirement: [],
  };
  for (const p of photos as PhotoRow[]) grouped[p.category].push(p);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to="/books/$bookId"
        params={{ bookId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to book
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Photo gallery</h1>
          <p className="mt-1 text-muted-foreground">
            Upload memories by life chapter. Images are compressed automatically for fast loading.
          </p>
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleUploadFiles(e.target.files, activeCat);
              }
            }}
          />
          <Button
            size="lg"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload to {CATEGORY_LABEL[activeCat]}
          </Button>
        </div>
      </div>

      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const target = (photos as PhotoRow[]).find((p) => p.id === replacingId);
          if (f && target) handleReplaceFile(f, target);
        }}
      />

      <Tabs
        value={activeCat}
        onValueChange={(v) => setActiveCat(v as PhotoCategory)}
        className="mt-6"
      >
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          {PHOTO_CATEGORIES.map((c) => (
            <TabsTrigger
              key={c}
              value={c}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {CATEGORY_LABEL[c]}{" "}
              <span className="ml-1.5 text-xs opacity-70">({grouped[c].length})</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {PHOTO_CATEGORIES.map((c) => (
          <TabsContent key={c} value={c} className="mt-6">
            {isLoading ? (
              <div className="rounded-2xl border border-border/60 bg-background p-10 text-center text-muted-foreground">
                Loading…
              </div>
            ) : grouped[c].length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-semibold">No {CATEGORY_LABEL[c]} photos yet</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Upload photos to build this chapter of the story.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {grouped[c].map((p) => (
                  <div
                    key={p.id}
                    className="group overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm"
                  >
                    <div className="relative aspect-square bg-muted">
                      {p.url ? (
                        <img
                          src={p.url}
                          alt={p.filename}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium" title={p.filename}>
                        {p.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.width && p.height ? `${p.width}×${p.height}` : ""}
                        {p.size_bytes ? ` · ${(p.size_bytes / 1024).toFixed(0)} KB` : ""}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setRenaming(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => {
                            setReplacingId(p.id);
                            replaceRef.current?.click();
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-8 px-2 text-destructive hover:text-destructive"
                          onClick={() => setPendingDelete(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Rename dialog */}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename photo</DialogTitle>
          </DialogHeader>
          {renaming && (
            <RenameForm
              initial={renaming.filename}
              submitting={renameMut.isPending}
              onSubmit={(name) => renameMut.mutate({ id: renaming.id, filename: name })}
              onCancel={() => setRenaming(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.filename}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteMut.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RenameForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = name.trim();
        if (v) onSubmit(v);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="filename">Filename</Label>
        <Input
          id="filename"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={255}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
