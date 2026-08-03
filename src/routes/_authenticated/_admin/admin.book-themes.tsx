import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Palette,
  Plus,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Star,
  Eye,
  ArrowUp,
  ArrowDown,
  Loader2,
  Upload,
  Layers,
  Sparkles,
  Type,
  Maximize2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminListThemes,
  adminCreateTheme,
  adminUpdateTheme,
  adminDeleteTheme,
  adminToggleThemeStatus,
  adminSetDefaultTheme,
  adminDuplicateTheme,
  adminReorderThemes,
  adminAddPreviewImage,
  adminDeletePreviewImage,
  type DbBookTheme,
} from "@/lib/themes.functions";
import { getTemplate } from "@/lib/book-templates";

export const Route = createFileRoute("/_authenticated/_admin/admin/book-themes")({
  head: () => ({
    meta: [
      { title: "Book Themes Management — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminBookThemesPage,
});

const DEFAULT_THEME_FORM: Record<string, any> = {
  slug: "",
  name: "",
  description: "",
  is_enabled: true,
  is_default: false,
  display_order: 0,
  cover_design: "plate",
  typography_name: "Classic Serif",
  fonts: {
    display: "'Playfair Display', Georgia, serif",
    body: "'EB Garamond', Georgia, serif",
    script: "'Cormorant Garamond', Georgia, serif",
  },
  color_palette: {
    paper: "#FFFBF5",
    ink: "#2B2118",
    muted: "#7A6A58",
    accent: "#8B5E3C",
    accentSoft: "rgba(139,94,60,0.10)",
    rule: "rgba(212,175,55,0.55)",
    deep: "#4A3423",
    coverInk: "#FFF7EA",
  },
  background_style: "none",
  background_name: "Plain white",
  header_style: "standard",
  footer_style: "standard",
  chapter_style: "numeral",
  timeline_style: "vertical",
  photo_layout: "rounded",
  quote_style: "center",
  divider_style: "ornament",
  page_number_style: "bottom-center",
  toc_style: "classic",
  cover_layout: "standard",
  back_cover_layout: "standard",
  print_settings: { pageSize: "trade", margins: "standard", bleedMm: 3 },
  cover_image_url: "",
};

function AdminBookThemesPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(adminListThemes);
  const createFn = useServerFn(adminCreateTheme);
  const updateFn = useServerFn(adminUpdateTheme);
  const deleteFn = useServerFn(adminDeleteTheme);
  const toggleFn = useServerFn(adminToggleThemeStatus);
  const setDefaultFn = useServerFn(adminSetDefaultTheme);
  const duplicateFn = useServerFn(adminDuplicateTheme);
  const reorderFn = useServerFn(adminReorderThemes);
  const addPreviewImgFn = useServerFn(adminAddPreviewImage);
  const deletePreviewImgFn = useServerFn(adminDeletePreviewImage);

  const { data: themes, isLoading } = useQuery({
    queryKey: ["admin", "book-themes"],
    queryFn: () => listFn(),
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<typeof DEFAULT_THEME_FORM>(DEFAULT_THEME_FORM);
  const [previewTheme, setPreviewTheme] = useState<DbBookTheme | null>(null);
  const [newPreviewUrl, setNewPreviewUrl] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return updateFn({ data: { id: editingId, theme: formData } });
      } else {
        return createFn({ data: formData });
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Theme updated successfully" : "Theme created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "book-themes"] });
      setEditorOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: string; is_enabled: boolean }) =>
      toggleFn({ data: vars }),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "book-themes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => setDefaultFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Default theme updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "book-themes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Theme duplicated");
      queryClient.invalidateQueries({ queryKey: ["admin", "book-themes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Theme deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "book-themes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      ...DEFAULT_THEME_FORM,
      display_order: (themes?.length ?? 0) + 1,
    });
    setEditorOpen(true);
  };

  const handleOpenEdit = (t: DbBookTheme) => {
    setEditingId(t.id);
    setFormData({
      slug: t.slug,
      name: t.name,
      description: t.description || "",
      is_enabled: t.is_enabled,
      is_default: t.is_default,
      display_order: t.display_order,
      cover_design: t.cover_design,
      typography_name: t.typography_name || "",
      fonts: t.fonts,
      color_palette: t.color_palette,
      background_style: t.background_style,
      background_name: t.background_name,
      header_style: t.header_style,
      footer_style: t.footer_style,
      chapter_style: t.chapter_style,
      timeline_style: t.timeline_style,
      photo_layout: t.photo_layout,
      quote_style: t.quote_style,
      divider_style: t.divider_style,
      page_number_style: t.page_number_style,
      toc_style: t.toc_style,
      cover_layout: t.cover_layout,
      back_cover_layout: t.back_cover_layout,
      print_settings: t.print_settings,
      cover_image_url: t.cover_image_url || "",
    });
    setEditorOpen(true);
  };

  const moveOrder = async (index: number, direction: "up" | "down") => {
    if (!themes) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= themes.length) return;

    const list = [...themes];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const items = list.map((t, idx) => ({ id: t.id, display_order: idx + 1 }));
    try {
      await reorderFn({ data: { items } });
      toast.success("Order updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "book-themes"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAddPreviewImage = async () => {
    if (!editingId || !newPreviewUrl.trim()) return;
    try {
      await addPreviewImgFn({
        data: { themeId: editingId, imageUrl: newPreviewUrl.trim() },
      });
      toast.success("Preview image added");
      setNewPreviewUrl("");
      queryClient.invalidateQueries({ queryKey: ["admin", "book-themes"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeletePreviewImage = async (imgId: string) => {
    try {
      await deletePreviewImgFn({ data: { imageId: imgId } });
      toast.success("Preview image removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "book-themes"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" /> Loading book themes…
      </div>
    );
  }

  const themeList = themes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Book Themes System</h1>
          <p className="text-sm text-muted-foreground">
            Manage dynamic book themes, typography, color palettes, cover layouts, and default settings.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Create New Theme
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themeList.map((t, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === themeList.length - 1;
          const previewTpl = getTemplate(t);

          return (
            <div
              key={t.id}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md ${
                t.is_default ? "border-primary shadow-sm" : "border-border/60"
              }`}
            >
              {/* Top Banner & Badges */}
              <div
                className="relative h-28 p-4"
                style={{
                  background: t.color_palette.paper,
                  color: t.color_palette.ink,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {t.is_default && (
                      <Badge className="bg-primary text-primary-foreground">
                        <Star className="mr-1 h-3 w-3 fill-current" /> Default Theme
                      </Badge>
                    )}
                    {t.is_enabled ? (
                      <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-background/80 backdrop-blur-xs rounded-md p-1">
                    <button
                      onClick={() => moveOrder(idx, "up")}
                      disabled={isFirst}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveOrder(idx, "down")}
                      disabled={isLast}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="font-semibold text-lg leading-tight truncate" style={{ fontFamily: previewTpl.fonts.display }}>
                    {t.name}
                  </h3>
                  <p className="text-xs opacity-75 font-mono">slug: {t.slug}</p>
                </div>
              </div>

              {/* Theme Body Info */}
              <div className="flex-1 p-4 space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-2">{t.description || "No description provided."}</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/40 p-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Cover Design</span>
                    <span className="font-medium capitalize">{t.cover_design}</span>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Chapter Style</span>
                    <span className="font-medium capitalize">{t.chapter_style}</span>
                  </div>
                </div>

                {/* Swatches */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Palette:</span>
                  <div className="flex items-center gap-1">
                    <div className="h-4 w-4 rounded-full border border-border" style={{ background: t.color_palette.paper }} title="Paper" />
                    <div className="h-4 w-4 rounded-full border border-border" style={{ background: t.color_palette.ink }} title="Ink" />
                    <div className="h-4 w-4 rounded-full border border-border" style={{ background: t.color_palette.accent }} title="Accent" />
                    <div className="h-4 w-4 rounded-full border border-border" style={{ background: t.color_palette.rule }} title="Rule" />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between border-t border-border/60 p-3 bg-muted/20">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewTheme(t)}
                    title="Preview Theme"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenEdit(t)}
                    title="Edit Theme"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => duplicateMutation.mutate(t.id)}
                    title="Duplicate Theme"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {!t.is_default && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDefaultMutation.mutate(t.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Switch
                    checked={t.is_enabled}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: t.id, is_enabled: checked })
                    }
                    title={t.is_enabled ? "Disable Theme" : "Enable Theme"}
                  />
                  {!t.is_default && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete theme "${t.name}"?`)) {
                          deleteMutation.mutate(t.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Theme Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? `Edit Theme: ${formData.name}` : "Create New Book Theme"}</DialogTitle>
            <DialogDescription>
              Configure typography, colors, layout rules, and assets for this dynamic book theme.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic & Status</TabsTrigger>
              <TabsTrigger value="typography">Typography & Colors</TabsTrigger>
              <TabsTrigger value="layouts">Layout & Styles</TabsTrigger>
              <TabsTrigger value="assets">Images & Previews</TabsTrigger>
            </TabsList>

            {/* TAB 1: BASIC & STATUS */}
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Theme Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
                      setFormData((prev) => ({
                        ...prev,
                        name,
                        slug: editingId ? prev.slug : slug,
                      }));
                    }}
                    placeholder="e.g. Royal Heritage"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Theme Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g. royal_heritage"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the aesthetic and tone of this book template..."
                  rows={3}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Theme</Label>
                  <p className="text-xs text-muted-foreground">
                    Enabled themes are visible to end users in the book builder.
                  </p>
                </div>
                <Switch
                  checked={formData.is_enabled}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_enabled: checked }))}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Set as System Default Theme</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically applied if user skips selecting a theme.
                  </p>
                </div>
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_default: checked }))}
                />
              </div>
            </TabsContent>

            {/* TAB 2: TYPOGRAPHY & COLORS */}
            <TabsContent value="typography" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="typography_name">Typography Name / Pair Label</Label>
                <Input
                  id="typography_name"
                  value={formData.typography_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, typography_name: e.target.value }))}
                  placeholder="e.g. Royal Serif — Cinzel / EB Garamond"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="font_display" className="text-xs">Display Font CSS</Label>
                  <Input
                    id="font_display"
                    value={formData.fonts.display}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fonts: { ...prev.fonts, display: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="font_body" className="text-xs">Body Font CSS</Label>
                  <Input
                    id="font_body"
                    value={formData.fonts.body}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fonts: { ...prev.fonts, body: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="font_script" className="text-xs">Script / Accent Font CSS</Label>
                  <Input
                    id="font_script"
                    value={formData.fonts.script}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fonts: { ...prev.fonts, script: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="pt-2">
                <Label className="text-sm font-semibold">Color Palette (HEX / RGBA)</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {Object.entries(formData.color_palette).map(([key, val]) => {
                    const strVal = String(val ?? "");
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`color_${key}`} className="text-xs capitalize">{key}</Label>
                          <input
                            type="color"
                            value={strVal.startsWith("#") ? strVal : "#888888"}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                color_palette: { ...prev.color_palette, [key]: e.target.value },
                              }))
                            }
                            className="h-5 w-5 rounded cursor-pointer border-0"
                          />
                        </div>
                        <Input
                          id={`color_${key}`}
                          value={strVal}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              color_palette: { ...prev.color_palette, [key]: e.target.value },
                            }))
                          }
                          className="text-xs font-mono h-8"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: LAYOUT & STYLES */}
            <TabsContent value="layouts" className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Cover Design</Label>
                  <Select
                    value={formData.cover_design}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, cover_design: val }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plate">Plate</SelectItem>
                      <SelectItem value="framed">Framed</SelectItem>
                      <SelectItem value="masthead">Masthead</SelectItem>
                      <SelectItem value="fullbleed">Full Bleed</SelectItem>
                      <SelectItem value="polaroid">Polaroid</SelectItem>
                      <SelectItem value="crest">Crest</SelectItem>
                      <SelectItem value="typeonly">Type Only</SelectItem>
                      <SelectItem value="collage">Collage</SelectItem>
                      <SelectItem value="band">Leather Band</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Chapter Opener Style</Label>
                  <Select
                    value={formData.chapter_style}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, chapter_style: val }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="numeral">Numeral</SelectItem>
                      <SelectItem value="photo">Photo Header</SelectItem>
                      <SelectItem value="band">Accent Band</SelectItem>
                      <SelectItem value="folio">Folio</SelectItem>
                      <SelectItem value="ornament">Ornament</SelectItem>
                      <SelectItem value="split">Split Spread</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Photo Layout Style</Label>
                  <Select
                    value={formData.photo_layout}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, photo_layout: val }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Page</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="collage">Collage</SelectItem>
                      <SelectItem value="polaroid">Polaroid</SelectItem>
                      <SelectItem value="rounded">Rounded</SelectItem>
                      <SelectItem value="vintage">Vintage Frame</SelectItem>
                      <SelectItem value="borderless">Borderless</SelectItem>
                      <SelectItem value="magazine">Magazine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Timeline Style</Label>
                  <Select
                    value={formData.timeline_style}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, timeline_style: val }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vertical">Vertical</SelectItem>
                      <SelectItem value="horizontal">Horizontal</SelectItem>
                      <SelectItem value="cards">Cards</SelectItem>
                      <SelectItem value="journey">Journey</SelectItem>
                      <SelectItem value="illustrated">Illustrated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quote Style</Label>
                  <Select
                    value={formData.quote_style}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, quote_style: val }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">Centered</SelectItem>
                      <SelectItem value="side">Side</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="handwritten">Handwritten</SelectItem>
                      <SelectItem value="pull">Pull Quote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Divider Style</Label>
                  <Select
                    value={formData.divider_style}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, divider_style: val }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ornament">Ornament</SelectItem>
                      <SelectItem value="rule">Rule</SelectItem>
                      <SelectItem value="dots">Dots</SelectItem>
                      <SelectItem value="wave">Wave</SelectItem>
                      <SelectItem value="tape">Tape</SelectItem>
                      <SelectItem value="vine">Vine</SelectItem>
                      <SelectItem value="block">Block</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bg_name">Background Name</Label>
                  <Input
                    id="bg_name"
                    value={formData.background_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, background_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bg_style">Background CSS Style</Label>
                  <Input
                    id="bg_style"
                    value={formData.background_style}
                    onChange={(e) => setFormData((prev) => ({ ...prev, background_style: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: ASSETS & PREVIEWS */}
            <TabsContent value="assets" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="cover_image_url">Cover Hero Image URL</Label>
                <Input
                  id="cover_image_url"
                  value={formData.cover_image_url || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cover_image_url: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              {editingId && (
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-semibold">Theme Preview Images</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste preview image URL..."
                      value={newPreviewUrl}
                      onChange={(e) => setNewPreviewUrl(e.target.value)}
                    />
                    <Button onClick={handleAddPreviewImage}>
                      <Upload className="mr-1 h-4 w-4" /> Add Image
                    </Button>
                  </div>

                  {/* List preview images for this editing theme */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {themes
                      .find((t) => t.id === editingId)
                      ?.preview_images?.map((img) => (
                        <div key={img.id} className="group relative overflow-hidden rounded-lg border">
                          <img src={img.image_url} alt="Preview" className="h-28 w-full object-cover" />
                          <button
                            onClick={() => handleDeletePreviewImage(img.id)}
                            className="absolute top-1 right-1 rounded-full bg-destructive p-1 text-white opacity-80 hover:opacity-100"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Save Changes" : "Create Theme"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Theme Live Preview Modal */}
      {previewTheme && (
        <Dialog open={!!previewTheme} onOpenChange={() => setPreviewTheme(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" /> Live Preview: {previewTheme.name}
              </DialogTitle>
              <DialogDescription>{previewTheme.description}</DialogDescription>
            </DialogHeader>

            <div
              className="rounded-xl border p-8 shadow-inner space-y-6"
              style={{
                background: previewTheme.color_palette.paper,
                color: previewTheme.color_palette.ink,
              }}
            >
              <div className="text-center space-y-2 border-b pb-6" style={{ borderColor: previewTheme.color_palette.rule }}>
                <p className="text-xs uppercase tracking-widest" style={{ color: previewTheme.color_palette.accent }}>
                  Chapter One
                </p>
                <h2 className="text-3xl font-bold" style={{ fontFamily: previewTheme.fonts.display }}>
                  Early Childhood & Roots
                </h2>
                <p className="text-sm font-serif italic" style={{ color: previewTheme.color_palette.muted }}>
                  “Memories carved into timeless stories.”
                </p>
              </div>

              <div className="prose text-sm leading-relaxed" style={{ fontFamily: previewTheme.fonts.body }}>
                <p>
                  <span className="float-left text-4xl font-bold mr-2 leading-none" style={{ color: previewTheme.color_palette.accent }}>
                    T
                  </span>
                  he morning air in summer was soft and filled with the scent of pine and wild honeysuckle.
                  We spent countless afternoons exploring the winding paths behind our family home, gathering memories that would stay with us forever.
                </p>
              </div>

              <div
                className="rounded-lg p-4 text-center italic text-sm border-l-4"
                style={{
                  background: previewTheme.color_palette.accentSoft,
                  borderLeftColor: previewTheme.color_palette.accent,
                  fontFamily: previewTheme.fonts.script,
                }}
              >
                “Family is not an important thing. It's everything.”
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setPreviewTheme(null)}>Close Preview</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
