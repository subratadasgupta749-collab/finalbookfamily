import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPageHeader } from "@/components/admin/table-controls";
import { toast } from "sonner";
import {
  Save,
  Eye,
  History,
  RotateCcw,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  FileCode,
  Globe,
  Sparkles,
} from "lucide-react";
import {
  getLegalPage,
  saveLegalPage,
  getLegalPageRevisions,
  restoreLegalPageRevision,
  type LegalPageData,
  type LegalPageRevision,
  type FAQItem,
} from "@/lib/legal.functions";
import "quill/dist/quill.snow.css";

export const Route = createFileRoute("/_authenticated/_admin/admin/legal")({
  head: () => ({
    meta: [
      { title: "Legal Pages Management — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LegalAdminPage,
});

const LEGAL_SLUGS = [
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "terms", label: "Terms & Conditions" },
  { slug: "refund", label: "Refund Policy" },
  { slug: "cookies", label: "Cookie Policy" },
  { slug: "disclaimer", label: "Disclaimer" },
  { slug: "dmca", label: "DMCA Policy" },
] as const;

function LegalAdminPage() {
  const [activeSlug, setActiveSlug] = useState<string>("privacy");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [eyebrow, setEyebrow] = useState("Legal");
  const [published, setPublished] = useState(true);
  const [content, setContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [twitterTitle, setTwitterTitle] = useState("");
  const [twitterDescription, setTwitterDescription] = useState("");
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  // Modals / Drawers
  const [showPreview, setShowPreview] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions] = useState<LegalPageRevision[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // Editor refs
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  // Load page data when activeSlug changes
  useEffect(() => {
    let active = true;
    setLoading(true);
    getLegalPage({ data: { slug: activeSlug } })
      .then((data: LegalPageData) => {
        if (!active) return;
        setTitle(data.title);
        setEyebrow(data.eyebrow || "Legal");
        setPublished(data.published ?? true);
        const html = data.content || "";
        setContent(html);
        contentRef.current = html;
        if (quillRef.current && quillRef.current.root.innerHTML !== html) {
          quillRef.current.root.innerHTML = html;
        }
        setMetaTitle(data.seo?.metaTitle || "");
        setMetaDescription(data.seo?.metaDescription || "");
        setCanonicalUrl(data.seo?.canonicalUrl || `https://myfamilyhistorybook.com/${data.slug}`);
        setOgTitle(data.seo?.ogTitle || "");
        setOgDescription(data.seo?.ogDescription || "");
        setTwitterTitle(data.seo?.twitterTitle || "");
        setTwitterDescription(data.seo?.twitterDescription || "");
        setFaqs(data.seo?.faqs || []);
      })
      .catch((e: any) => toast.error(e.message))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeSlug]);

  // Quill Editor Initialization
  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    let isMounted = true;
    (async () => {
      const Quill = (await import("quill")).default;
      if (!isMounted || !editorContainerRef.current) return;
      if (!quillRef.current) {
        const q = new Quill(editorContainerRef.current, {
          theme: "snow",
          modules: {
            toolbar: [
              [{ header: [1, 2, 3, 4, false] }],
              ["bold", "italic", "underline", "strike", "blockquote"],
              [{ align: [] }],
              [{ list: "ordered" }, { list: "bullet" }],
              ["link", "clean"],
            ],
          },
        });

        if (contentRef.current && q.root.innerHTML !== contentRef.current) {
          q.root.innerHTML = contentRef.current;
        }

        q.on("text-change", () => {
          const html = q.root.innerHTML;
          contentRef.current = html;
          setContent(html);
        });

        quillRef.current = q;
      } else {
        if (contentRef.current && quillRef.current.root.innerHTML !== contentRef.current) {
          quillRef.current.root.innerHTML = contentRef.current;
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [loading]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveLegalPage({
        data: {
          slug: activeSlug,
          title,
          eyebrow,
          published,
          content: contentRef.current,
          seo: {
            metaTitle,
            metaDescription,
            canonicalUrl,
            ogTitle,
            ogDescription,
            twitterTitle,
            twitterDescription,
            faqs,
          },
        },
      });
      setLastSavedTime(new Date().toLocaleTimeString());
      toast.success(`${title} saved successfully`);
    } catch (e: any) {
      toast.error(e.message || "Failed to save legal page");
    } finally {
      setSaving(false);
    }
  };

  const loadRevisionsList = async () => {
    setShowRevisions(true);
    setLoadingRevisions(true);
    try {
      const revs = await getLegalPageRevisions({ data: { slug: activeSlug } });
      setRevisions(revs);
    } catch (e: any) {
      toast.error(e.message || "Failed to load revisions");
    } finally {
      setLoadingRevisions(false);
    }
  };

  const handleRestoreRevision = async (timestamp: string) => {
    try {
      const res = await restoreLegalPageRevision({ data: { slug: activeSlug, timestamp } });
      const restored = res.data;
      setTitle(restored.title);
      setEyebrow(restored.eyebrow);
      setContent(restored.content);
      contentRef.current = restored.content;
      if (quillRef.current) {
        quillRef.current.root.innerHTML = restored.content;
      }
      setMetaTitle(restored.seo.metaTitle);
      setMetaDescription(restored.seo.metaDescription);
      setShowRevisions(false);
      toast.success("Revision restored successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to restore revision");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title="Legal Pages Management"
        subtitle="Draft, edit, version control, and publish international compliance documents and SEO metadata."
      />

      {/* Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <Tabs value={activeSlug} onValueChange={setActiveSlug} className="w-full sm:w-auto">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {LEGAL_SLUGS.map((item) => (
              <TabsTrigger key={item.slug} value={item.slug} className="text-xs sm:text-sm">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          {lastSavedTime && (
            <span className="text-xs text-muted-foreground hidden sm:inline flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Saved at {lastSavedTime}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-1.5" /> Preview
          </Button>
          <Button variant="outline" size="sm" onClick={loadRevisionsList}>
            <History className="h-4 w-4 mr-1.5" /> Revisions
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content & Rich Text Editor */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Document Setup</h3>
                <div className="flex items-center gap-2">
                  <Switch checked={published} onCheckedChange={setPublished} id="pub-switch" />
                  <Label htmlFor="pub-switch" className="text-sm font-medium">
                    {published ? "Published" : "Draft Mode"}
                  </Label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Page Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Privacy Policy" />
                </div>
                <div>
                  <Label>Eyebrow Header</Label>
                  <Input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="e.g. Legal & Compliance" />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Legal Document Content (Rich Text)</Label>
                <span className="text-xs text-muted-foreground">HTML / Styled Formatting</span>
              </div>
              <style>{`
                .ql-container { min-height: 450px; font-size: 15px; border-bottom-left-radius: 0.5rem; border-bottom-right-radius: 0.5rem; }
                .ql-toolbar { border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; background: #f8fafc; }
                .ql-editor { min-height: 450px; }
                .dark .ql-toolbar { background: #1e293b; border-color: #334155; }
                .dark .ql-container { border-color: #334155; }
              `}</style>
              <div ref={editorContainerRef} />
            </Card>
          </div>

          {/* Sidebar SEO & Schema Controls */}
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-base">
                <Globe className="h-4 w-4 text-primary" /> SEO & Meta Data
              </div>

              <div>
                <Label className="text-xs">Meta Title</Label>
                <Input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Meta Title"
                  className="text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Meta Description</Label>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                  placeholder="Meta Description"
                  className="text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Canonical URL</Label>
                <Input
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://myfamilyhistorybook.com/privacy"
                  className="text-xs"
                />
              </div>

              <div className="border-t pt-3 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground">Open Graph & Twitter Cards</h4>
                <div>
                  <Label className="text-xs">OG Title</Label>
                  <Input value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs">OG Description</Label>
                  <Textarea value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} rows={2} className="text-xs" />
                </div>
              </div>
            </Card>

            {/* FAQ Schema Builder */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-base">
                  <Sparkles className="h-4 w-4 text-amber-500" /> FAQ Schema Builder
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add FAQ
                </Button>
              </div>

              {faqs.map((f, i) => (
                <div key={i} className="space-y-2 rounded-md border p-3 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Input
                      value={f.question}
                      onChange={(e) =>
                        setFaqs(faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))
                      }
                      placeholder="Question"
                      className="text-xs"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Textarea
                    value={f.answer}
                    onChange={(e) =>
                      setFaqs(faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))
                    }
                    placeholder="Answer"
                    rows={2}
                    className="text-xs"
                  />
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileCode className="h-5 w-5 text-primary" /> Live Document Preview — {title}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                Close Preview
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 prose dark:prose-invert max-w-none">
              <div className="border-b pb-4">
                <p className="text-xs uppercase tracking-widest text-primary font-semibold">{eyebrow}</p>
                <h1 className="text-3xl font-serif font-bold mt-1">{title}</h1>
                <p className="text-xs text-muted-foreground mt-2">
                  Last Updated: {new Date().toLocaleDateString()}
                </p>
              </div>
              <div dangerouslySetInnerHTML={{ __html: contentRef.current }} />
            </div>
          </div>
        </div>
      )}

      {/* Revisions History Drawer */}
      {showRevisions && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
          <div className="flex h-full w-full max-w-md flex-col bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Revision History
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowRevisions(false)}>
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {loadingRevisions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : revisions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No prior revisions recorded.</p>
              ) : (
                revisions.map((rev, idx) => (
                  <Card key={idx} className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">
                        {new Date(rev.timestamp).toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreRevision(rev.timestamp)}
                        className="h-7 text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Restore
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{rev.title}</p>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
