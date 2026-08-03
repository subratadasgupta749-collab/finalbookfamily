import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  FileType,
  Loader2,
  Trash2,
  Pencil,
  Sliders,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getManuscript, setTheme, type BookThemeId } from "@/lib/manuscript.functions";
import { getBook } from "@/lib/books.functions";
import { generateExport, listExports, deleteExport } from "@/lib/exports.functions";
import { listPhotos, type PhotoCategory } from "@/lib/photos.functions";
import { getAvailableThemes } from "@/lib/themes.functions";
import { BookRender } from "@/components/book/book-render";
import {
  BACKGROUND_OPTIONS,
  BOOK_TEMPLATES,
  DEFAULT_CUSTOMISATION,
  FONT_PAIR_OPTIONS,
  PAGE_SIZES,
  PHOTO_LAYOUT_OPTIONS,
  QUOTE_OPTIONS,
  TIMELINE_OPTIONS,
  dbThemeToTemplate,
  getTemplate,
  resolveDesign,
  type BookCustomisation,
  type PageSizeId,
} from "@/lib/book-templates";

const bookQ = (id: string) =>
  queryOptions({ queryKey: ["books", id], queryFn: () => getBook({ data: { id } }) });
const manuscriptQ = (id: string) =>
  queryOptions({ queryKey: ["manuscript", id], queryFn: () => getManuscript({ data: { bookId: id } }) });
const exportsQ = (id: string) =>
  queryOptions({ queryKey: ["exports", id], queryFn: () => listExports({ data: { bookId: id } }) });
const photosQ = (id: string) =>
  queryOptions({ queryKey: ["photos", id], queryFn: () => listPhotos({ data: { bookId: id } }) });
const availableThemesQ = () =>
  queryOptions({ queryKey: ["available-themes"], queryFn: () => getAvailableThemes() });

const TOPIC_TO_CATEGORY: Record<string, PhotoCategory> = {
  childhood: "baby",
  school: "school",
  love: "wedding",
  marriage: "wedding",
  children: "family",
  family: "family",
  job: "career",
  career: "career",
  achievements: "career",
  challenges: "family",
  retirement: "retirement",
  advice: "family",
};

export const Route = createFileRoute("/_authenticated/_app/books/$bookId/preview")({
  head: () => ({
    meta: [{ title: "Preview — My Family History Book" }, { name: "robots", content: "noindex" }],
  }),
  component: PreviewPage,
});

function useCustomisation(bookId: string) {
  const key = `bk-custom-${bookId}`;
  const [custom, setCustom] = useState<BookCustomisation>(DEFAULT_CUSTOMISATION);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setCustom({ ...DEFAULT_CUSTOMISATION, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, [key]);

  const update = (patch: Partial<BookCustomisation>) =>
    setCustom((prev) => {
      const nextValue = { ...prev, ...patch };
      try {
        localStorage.setItem(key, JSON.stringify(nextValue));
      } catch {
        /* ignore */
      }
      return nextValue;
    });

  return { custom, update };
}

function PreviewPage() {
  const { bookId } = Route.useParams();
  const queryClient = useQueryClient();
  const { custom, update } = useCustomisation(bookId);
  const [panelOpen, setPanelOpen] = useState(false);

  const bookQuery = useQuery(bookQ(bookId));
  const manuscriptQuery = useQuery(manuscriptQ(bookId));
  const exportsQuery = useQuery(exportsQ(bookId));
  const photosQuery = useQuery(photosQ(bookId));
  const themesQuery = useQuery(availableThemesQ());

  const availableThemes = useMemo(() => {
    if (themesQuery.data && themesQuery.data.length > 0) {
      return themesQuery.data.map((t) => dbThemeToTemplate(t));
    }
    return BOOK_TEMPLATES;
  }, [themesQuery.data]);

  const exportDesign = () => {
    const activeThemeId = manuscriptQuery.data?.manuscript?.theme ?? "classic";
    const foundTheme = themesQuery.data?.find((t) => t.slug === activeThemeId);
    const tpl = foundTheme ? dbThemeToTemplate(foundTheme) : getTemplate(activeThemeId as string);
    const design = resolveDesign(tpl, custom);
    const pageSize = PAGE_SIZES[custom.pageSize as PageSizeId];
    return {
      paper: design.palette.paper,
      ink: design.palette.ink,
      muted: design.palette.muted,
      accent: design.palette.accent,
      rule: design.palette.rule,
      accentSoft: design.palette.accentSoft,
      background: design.background,
      pageWidthMm: pageSize.w,
      pageHeightMm: pageSize.h,
      marginMm: custom.margin,
      displayFont: design.fonts.display,
      bodyFont: design.fonts.body,
      showFooter: custom.showFooter,
      dedication: custom.dedication,
      familyQuote: custom.familyQuote,
      thankYou: custom.thankYou,
      templateLabel: design.label,
      templateId: design.id,
      coverStyle: design.cover,
      openerStyle: design.opener,
      photoLayout: design.photo,
      timelineStyle: design.timeline,
      quoteStyle: design.quote,
      dividerStyle: design.divider,
      deep: design.palette.deep,
      coverInk: design.palette.coverInk,
      dropCap: design.dropCap,
      uppercaseLabels: design.uppercaseLabels,
      bodySize: design.bodySize,
      bodyLeading: design.bodyLeading,
      showHeader: custom.showHeader,
      coverPhotoId: custom.coverPhotoId,
    };
  };

  const generateFn = useServerFn(generateExport);
  const deleteFn = useServerFn(deleteExport);
  const setThemeFn = useServerFn(setTheme);

  const genMutation = useMutation({
    mutationFn: (kind: "pdf" | "docx" | "print_pdf") =>
      generateFn({ data: { bookId, kind, design: exportDesign() } }),
    onSuccess: (result, kind) => {
      toast.success("Export ready");
      queryClient.invalidateQueries({ queryKey: ["exports", bookId] });
      if (kind === "pdf" && result?.url) {
        downloadFile(result.url, result.filename);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["exports", bookId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const themeMutation = useMutation({
    mutationFn: (theme: BookThemeId) => setThemeFn({ data: { bookId, theme } }),
    onSuccess: () => {
      toast.success("Template applied");
      queryClient.invalidateQueries({ queryKey: ["manuscript", bookId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allPhotos = (photosQuery.data ?? []) as Array<{
    id: string;
    category: PhotoCategory;
    url: string | null;
    filename: string;
    caption?: string | null;
  }>;

  const photosByCategory = useMemo(
    () =>
      allPhotos.reduce(
        (acc, p) => {
          (acc[p.category] ||= []).push(p);
          return acc;
        },
        {} as Record<string, typeof allPhotos>,
      ),
    [allPhotos],
  );

  if (bookQuery.isLoading || manuscriptQuery.isLoading || !bookQuery.data || !manuscriptQuery.data) {
    return <div className="mx-auto max-w-4xl text-center text-muted-foreground">Loading…</div>;
  }

  const book = bookQuery.data;
  const { manuscript, chapters } = manuscriptQuery.data;
  const themeId = (manuscript?.theme ?? "classic") as BookThemeId;
  const template = getTemplate(themeId);
  const hasContent = (chapters?.length ?? 0) > 0;

  const size = PAGE_SIZES[custom.pageSize as PageSizeId];
  const pageVars = {
    ["--bk-ratio" as any]: `${size.w} / ${size.h}`,
    ["--bk-margin" as any]: `${custom.margin}mm`,
    ["--bk-page-w" as any]: `${size.w}mm`,
    ["--bk-page-h" as any]: `${size.h}mm`,
  } as React.CSSProperties;



  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to="/books/$bookId"
        params={{ bookId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft className="h-4 w-4" /> Back to book
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Preview & Export</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A fully typeset, print-ready book. Choose a template, then fine-tune every detail.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPanelOpen((o) => !o)}>
            <Sliders className="mr-1.5 h-3.5 w-3.5" /> Customise
          </Button>
          <Link
            to="/books/$bookId/manuscript"
            params={{ bookId }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit text
          </Link>
          <Link
            to="/books/$bookId/photos"
            params={{ bookId }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit photos
          </Link>
          <Link
            to="/checkout"
            search={{ bookId }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Buy this book
          </Link>
        </div>
      </div>

      {!hasContent ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border/60 bg-background p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-primary" />
          <h3 className="mt-3 font-semibold">No manuscript yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate the biography first, then come back to preview and export it.
          </p>
          <Link
            to="/books/$bookId/manuscript"
            params={{ bookId }}
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Open manuscript
          </Link>
        </div>
      ) : (
        <>
          {/* Template gallery */}
          <div className="mt-6 rounded-2xl border border-border/60 bg-background p-5 print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Book template</h2>
                <p className="text-sm text-muted-foreground">
                  Twelve distinct publishing identities — layout, typography, ornament and photo language.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availableThemes.map((tpl) => {
                const active = tpl.id === themeId;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => themeMutation.mutate(tpl.id as BookThemeId)}
                    className={`rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border/70 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-9 w-7 shrink-0 rounded-[3px] border shadow-sm"
                        style={{
                          background:
                            tpl.background === "none"
                              ? tpl.palette.paper
                              : `${tpl.background}, ${tpl.palette.paper}`,
                          borderColor: tpl.palette.rule,
                        }}
                      />
                      <div className="min-w-0">
                        <div
                          className="truncate font-semibold"
                          style={{ fontFamily: tpl.fonts.display }}
                        >
                          {tpl.label}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {tpl.typographyName}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{tpl.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {[tpl.backgroundName, `${tpl.photo} photos`, `${tpl.timeline} timeline`].map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customisation */}
          {panelOpen && (
            <div className="mt-4 rounded-2xl border border-border/60 bg-background p-5 print:hidden">
              <h2 className="font-semibold">Customise</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Font pairing">
                  <select
                    className="bk-input"
                    value={custom.fontPair}
                    onChange={(e) => update({ fontPair: e.target.value })}
                  >
                    {FONT_PAIR_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Background">
                  <select
                    className="bk-input"
                    value={custom.background}
                    onChange={(e) => update({ background: e.target.value })}
                  >
                    {BACKGROUND_OPTIONS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Photo layout">
                  <select
                    className="bk-input"
                    value={custom.photoLayout}
                    onChange={(e) => update({ photoLayout: e.target.value as any })}
                  >
                    <option value="template">Template default</option>
                    {PHOTO_LAYOUT_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Timeline style">
                  <select
                    className="bk-input"
                    value={custom.timeline}
                    onChange={(e) => update({ timeline: e.target.value as any })}
                  >
                    <option value="template">Template default</option>
                    {TIMELINE_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quote style">
                  <select
                    className="bk-input"
                    value={custom.quote}
                    onChange={(e) => update({ quote: e.target.value as any })}
                  >
                    <option value="template">Template default</option>
                    {QUOTE_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Page size">
                  <select
                    className="bk-input"
                    value={custom.pageSize}
                    onChange={(e) => update({ pageSize: e.target.value as PageSizeId })}
                  >
                    {Object.entries(PAGE_SIZES).map(([id, s]) => (
                      <option key={id} value={id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={`Margins — ${custom.margin}mm`}>
                  <input
                    type="range"
                    min={10}
                    max={35}
                    value={custom.margin}
                    onChange={(e) => update({ margin: Number(e.target.value) })}
                    className="w-full"
                  />
                </Field>
                <Field label="Accent colour">
                  <input
                    type="color"
                    className="h-9 w-full rounded-md border border-border bg-background"
                    value={custom.accent || template.palette.accent}
                    onChange={(e) => update({ accent: e.target.value })}
                  />
                </Field>
                <Field label="Paper colour">
                  <input
                    type="color"
                    className="h-9 w-full rounded-md border border-border bg-background"
                    value={custom.paper || template.palette.paper}
                    onChange={(e) => update({ paper: e.target.value })}
                  />
                </Field>
                <Field label="Cover image">
                  <select
                    className="bk-input"
                    value={custom.coverPhotoId}
                    onChange={(e) => update({ coverPhotoId: e.target.value })}
                  >
                    <option value="auto">Automatic</option>
                    {allPhotos
                      .filter((p) => p.url)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.filename}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Dedication">
                  <input
                    className="bk-input"
                    placeholder="For my mother…"
                    value={custom.dedication}
                    onChange={(e) => update({ dedication: e.target.value })}
                  />
                </Field>
                <Field label="Family quote">
                  <input
                    className="bk-input"
                    placeholder="A family is…"
                    value={custom.familyQuote}
                    onChange={(e) => update({ familyQuote: e.target.value })}
                  />
                </Field>
                <Field label="Thank-you note">
                  <input
                    className="bk-input"
                    placeholder="Thank you to…"
                    value={custom.thankYou}
                    onChange={(e) => update({ thankYou: e.target.value })}
                  />
                </Field>
                <div className="flex items-end gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={custom.showHeader}
                      onChange={(e) => update({ showHeader: e.target.checked })}
                    />
                    Header
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={custom.showFooter}
                      onChange={(e) => update({ showFooter: e.target.checked })}
                    />
                    Footer
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={custom.bleed}
                      onChange={(e) => update({ bleed: e.target.checked })}
                    />
                    Bleed marks
                  </label>
                </div>
              </div>
              <button
                onClick={() => update(DEFAULT_CUSTOMISATION)}
                className="mt-4 text-xs text-muted-foreground underline"
              >
                Reset to template defaults
              </button>
            </div>
          )}

          {/* Export bar */}
          <div className="mt-4 rounded-2xl border border-border/60 bg-background p-5 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-semibold">Export</div>
                <div className="text-muted-foreground">
                  {template.label} · {size.label} · {custom.margin}mm margins
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => genMutation.mutate("pdf")}
                  disabled={genMutation.isPending}
                >
                  {genMutation.isPending && genMutation.variables === "pdf" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => genMutation.mutate("docx")}
                  disabled={genMutation.isPending}
                >
                  {genMutation.isPending && genMutation.variables === "docx" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileType className="mr-2 h-4 w-4" />
                  )}
                  DOCX
                </Button>
                <Button
                  variant="outline"
                  onClick={() => genMutation.mutate("print_pdf")}
                  disabled={genMutation.isPending}
                >
                  {genMutation.isPending && genMutation.variables === "print_pdf" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Backup PDF
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Your PDF is generated on the server and downloaded automatically. You can also
              re-download any previous export from the list below.
            </p>


            <div className="mt-4 space-y-2">
              {(exportsQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No exports yet.</p>
              ) : (
                (exportsQuery.data ?? []).map((e: any) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{e.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.kind === "print_pdf" ? "Backup PDF" : e.kind.toUpperCase()} ·{" "}
                        {formatBytes(Number(e.size_bytes ?? 0))} ·{" "}
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {e.url && (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
                        >
                          <Download className="h-3 w-3" /> Download
                        </a>
                      )}
                      <button
                        onClick={() => delMutation.mutate(e.id)}
                        className="inline-flex items-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Delete export"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* The book */}
          <div
            className={`mt-8 ${custom.bleed ? "bk-bleed-marks" : ""}`}
            style={pageVars}
          >
            <BookRender
              themeId={themeId}
              custom={custom}
              book={book}
              manuscript={manuscript}
              chapters={(chapters ?? []) as any}
              photos={allPhotos}
              photosByCategory={photosByCategory}
              topicToCategory={TOPIC_TO_CATEGORY}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function downloadFile(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
