import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getAllSettings, saveSettings, ALL_CATEGORIES } from "@/lib/settings.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminPageHeader } from "@/components/admin/table-controls";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { ImageUploadField } from "@/components/image-upload-field";

export const Route = createFileRoute("/_authenticated/_admin/admin/settings")({
  head: () => ({ meta: [{ title: "System Configuration — Admin" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

type AllSettings = Record<string, Record<string, any>>;

function SettingsPage() {
  const [all, setAll] = useState<AllSettings>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("general");

  useEffect(() => {
    getAllSettings()
      .then((d) => setAll((d as AllSettings) ?? {}))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const update = (cat: string, patch: Record<string, any>) =>
    setAll((prev) => ({ ...prev, [cat]: { ...(prev[cat] ?? {}), ...patch } }));

  const save = async (cat: string) => {
    setSavingKey(cat);
    try {
      await saveSettings({ data: { key: cat, value: all[cat] ?? {} } });
      toast.success(`${cat} settings saved`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        title="System Configuration"
        subtitle="Manage every setting from one place. Public values are served from /api/settings."
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex flex-nowrap">
            {ALL_CATEGORIES.map((c) => (
              <TabsTrigger key={c} value={c} className="capitalize">
                {c}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {ALL_CATEGORIES.map((cat) => (
          <TabsContent key={cat} value={cat}>
            <Card className="p-6 space-y-5">
              <CategoryEditor
                category={cat}
                value={all[cat] ?? {}}
                onChange={(patch) => update(cat, patch)}
              />
              <div className="flex justify-end pt-2 border-t">
                <Button onClick={() => save(cat)} disabled={savingKey === cat}>
                  {savingKey === cat ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save {cat}
                </Button>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/* ---------------- Category-specific editors ---------------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CategoryEditor({
  category,
  value,
  onChange,
}: {
  category: string;
  value: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
}) {
  const set = (k: string) => (e: any) =>
    onChange({ [k]: e?.target ? e.target.value : e });
  const setBool = (k: string) => (v: boolean) => onChange({ [k]: v });
  const setNum = (k: string) => (e: any) =>
    onChange({ [k]: e.target.value === "" ? null : Number(e.target.value) });

  const grid = "grid gap-4 md:grid-cols-2";

  switch (category) {
    case "general":
      return (
        <div className="space-y-5">
          <div className={grid}>
            <Field label="Site name"><Input value={value.site_name ?? ""} onChange={set("site_name")} /></Field>
            <Field label="Tagline"><Input value={value.tagline ?? ""} onChange={set("tagline")} /></Field>
            <Field label="Company name"><Input value={value.company_name ?? ""} onChange={set("company_name")} /></Field>
            <Field label="Company address"><Input value={value.company_address ?? ""} onChange={set("company_address")} /></Field>
            <Field label="Business email"><Input type="email" value={value.business_email ?? ""} onChange={set("business_email")} /></Field>
            <Field label="Support email"><Input type="email" value={value.support_email ?? ""} onChange={set("support_email")} /></Field>
            <Field label="Phone"><Input value={value.phone ?? ""} onChange={set("phone")} /></Field>
            <Field label="Country"><Input value={value.country ?? ""} onChange={set("country")} /></Field>
            <Field label="Timezone"><Input value={value.timezone ?? ""} onChange={set("timezone")} placeholder="UTC" /></Field>
            <Field label="Date format"><Input value={value.date_format ?? ""} onChange={set("date_format")} /></Field>
            <Field label="Time format"><Input value={value.time_format ?? ""} onChange={set("time_format")} /></Field>
            <Field label="Default currency"><Input value={value.default_currency ?? ""} onChange={set("default_currency")} placeholder="USD" /></Field>
            <Field label="Currency symbol"><Input value={value.currency_symbol ?? ""} onChange={set("currency_symbol")} placeholder="$" /></Field>
            <Field label="Default language"><Input value={value.default_language ?? ""} onChange={set("default_language")} placeholder="en" /></Field>
            <Field label="Available languages (comma-separated)">
              <Input
                value={(value.available_languages ?? []).join(", ")}
                onChange={(e) => onChange({ available_languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            </Field>
          </div>
          <div className={grid}>
            <Field label="Logo" hint="Light background logo"><ImageUploadField value={value.logo_url ?? ""} onChange={(v) => onChange({ logo_url: v })} folder="settings/logo" /></Field>
            <Field label="Dark logo"><ImageUploadField value={value.dark_logo_url ?? ""} onChange={(v) => onChange({ dark_logo_url: v })} folder="settings/logo" /></Field>
            <Field label="Footer logo"><ImageUploadField value={value.footer_logo_url ?? ""} onChange={(v) => onChange({ footer_logo_url: v })} folder="settings/logo" /></Field>
            <Field label="Favicon"><ImageUploadField value={value.favicon_url ?? ""} onChange={(v) => onChange({ favicon_url: v })} folder="settings/favicon" /></Field>
          </div>
        </div>
      );

    case "smtp":
      return (
        <div className={grid}>
          <Field label="Host"><Input value={value.host ?? ""} onChange={set("host")} placeholder="smtp.example.com" /></Field>
          <Field label="Port"><Input type="number" value={value.port ?? ""} onChange={setNum("port")} /></Field>
          <Field label="Username"><Input value={value.username ?? ""} onChange={set("username")} /></Field>
          <Field label="Password"><Input type="password" value={value.password ?? ""} onChange={set("password")} /></Field>
          <Field label="Encryption">
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={value.encryption ?? "tls"} onChange={set("encryption")}>
              <option value="none">None</option><option value="tls">TLS</option><option value="ssl">SSL</option>
            </select>
          </Field>
          <Field label="Sender name"><Input value={value.sender_name ?? ""} onChange={set("sender_name")} /></Field>
          <Field label="Sender email"><Input type="email" value={value.sender_email ?? ""} onChange={set("sender_email")} /></Field>
        </div>
      );

    case "seo":
      return (
        <div className="space-y-5">
          <div className={grid}>
            <Field label="Meta title"><Input value={value.title ?? ""} onChange={set("title")} /></Field>
            <Field label="Canonical URL"><Input value={value.canonical ?? ""} onChange={set("canonical")} /></Field>
          </div>
          <Field label="Meta description"><Textarea rows={2} value={value.description ?? ""} onChange={set("description")} /></Field>
          <Field label="Keywords"><Input value={value.keywords ?? ""} onChange={set("keywords")} /></Field>
          <div className={grid}>
            <Field label="OG image"><ImageUploadField value={value.og_image ?? ""} onChange={(v) => onChange({ og_image: v })} folder="settings/seo" /></Field>
            <Field label="Twitter card"><Input value={value.twitter_card ?? ""} onChange={set("twitter_card")} /></Field>
            <Field label="Google verification"><Input value={value.google_verification ?? ""} onChange={set("google_verification")} /></Field>
            <Field label="Bing verification"><Input value={value.bing_verification ?? ""} onChange={set("bing_verification")} /></Field>
            <Field label="Yandex verification"><Input value={value.yandex_verification ?? ""} onChange={set("yandex_verification")} /></Field>
            <Field label="Baidu verification"><Input value={value.baidu_verification ?? ""} onChange={set("baidu_verification")} /></Field>
            <Field label="Google Analytics ID"><Input value={value.ga_id ?? ""} onChange={set("ga_id")} placeholder="G-XXXXXXX" /></Field>
            <Field label="Google Tag Manager ID"><Input value={value.gtm_id ?? ""} onChange={set("gtm_id")} placeholder="GTM-XXXX" /></Field>
            <Field label="Facebook Pixel"><Input value={value.fb_pixel ?? ""} onChange={set("fb_pixel")} /></Field>
            <Field label="Microsoft Clarity"><Input value={value.clarity_id ?? ""} onChange={set("clarity_id")} /></Field>
          </div>
          <Field label="robots.txt"><Textarea rows={5} value={value.robots_txt ?? ""} onChange={set("robots_txt")} /></Field>
          <Field label="llms.txt"><Textarea rows={5} value={value.llms_txt ?? ""} onChange={set("llms_txt")} /></Field>
          <div className="flex items-center gap-3">
            <Switch checked={!!value.sitemap_enabled} onCheckedChange={setBool("sitemap_enabled")} />
            <span className="text-sm">Enable sitemap.xml</span>
          </div>
        </div>
      );

    case "social":
      return (
        <div className={grid}>
          {["facebook","instagram","youtube","pinterest","x","threads","linkedin","tiktok","whatsapp","telegram","quora"].map((k) => (
            <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
              <Input value={value[k] ?? ""} onChange={set(k)} placeholder="https://…" />
            </Field>
          ))}
        </div>
      );

    case "theme":
      return (
        <div className="space-y-5">
          <div className={grid}>
            <Field label="Primary color"><Input value={value.primary ?? ""} onChange={set("primary")} placeholder="#8B5E3C" /></Field>
            <Field label="Secondary color"><Input value={value.secondary ?? ""} onChange={set("secondary")} /></Field>
            <Field label="Accent color"><Input value={value.accent ?? ""} onChange={set("accent")} /></Field>
            <Field label="Heading font"><Input value={value.font_heading ?? ""} onChange={set("font_heading")} /></Field>
            <Field label="Body font"><Input value={value.font_body ?? ""} onChange={set("font_body")} /></Field>
            <Field label="Border radius"><Input value={value.radius ?? ""} onChange={set("radius")} placeholder="0.75rem" /></Field>
            <Field label="Button style">
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={value.button_style ?? "rounded"} onChange={set("button_style")}>
                <option value="rounded">Rounded</option><option value="pill">Pill</option><option value="square">Square</option>
              </select>
            </Field>
            <Field label="Loader style"><Input value={value.loader ?? ""} onChange={set("loader")} /></Field>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!value.dark_mode} onCheckedChange={setBool("dark_mode")} /> Dark mode default</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!value.animations} onCheckedChange={setBool("animations")} /> Animations</label>
          </div>
        </div>
      );

    case "homepage":
      return (
        <div className="space-y-5">
          <Field label="Hero title"><Input value={value.hero_title ?? ""} onChange={set("hero_title")} /></Field>
          <Field label="Hero subtitle"><Textarea rows={2} value={value.hero_subtitle ?? ""} onChange={set("hero_subtitle")} /></Field>
          <div className={grid}>
            <Field label="CTA label"><Input value={value.cta_label ?? ""} onChange={set("cta_label")} /></Field>
            <Field label="CTA link"><Input value={value.cta_href ?? ""} onChange={set("cta_href")} /></Field>
            <Field label="Hero image"><ImageUploadField value={value.hero_image ?? ""} onChange={(v) => onChange({ hero_image: v })} folder="settings/homepage" /></Field>
          </div>
          <Field label="About section (markdown)"><Textarea rows={4} value={value.about_section ?? ""} onChange={set("about_section")} /></Field>
          <Field label="Footer description"><Textarea rows={2} value={value.footer_description ?? ""} onChange={set("footer_description")} /></Field>
          <JsonEditor label="Features (JSON array)" value={value.features} onChange={(v) => onChange({ features: v })} />
          <JsonEditor label="Testimonials (JSON array)" value={value.testimonials} onChange={(v) => onChange({ testimonials: v })} />
          <JsonEditor label="Pricing (JSON array)" value={value.pricing} onChange={(v) => onChange({ pricing: v })} />
          <JsonEditor label="FAQ (JSON array)" value={value.faq} onChange={(v) => onChange({ faq: v })} />
        </div>
      );

    case "footer":
      return (
        <div className="space-y-5">
          <div className={grid}>
            <Field label="Footer logo"><ImageUploadField value={value.logo_url ?? ""} onChange={(v) => onChange({ logo_url: v })} folder="settings/footer" /></Field>
            <Field label="Logo text" hint="Shown next to the logo"><Input value={value.logo_text ?? ""} onChange={set("logo_text")} /></Field>
          </div>
          <Field label="Short description"><Textarea rows={3} value={value.description ?? ""} onChange={set("description")} /></Field>
          <div className={grid}>
            <Field label="Contact email"><Input type="email" value={value.email ?? ""} onChange={set("email")} /></Field>
            <Field label="Phone"><Input value={value.phone ?? ""} onChange={set("phone")} /></Field>
            <Field label="Address"><Input value={value.address ?? ""} onChange={set("address")} /></Field>
            <Field label="Copyright text" hint="Leave empty for automatic year + company name"><Input value={value.copyright ?? ""} onChange={set("copyright")} /></Field>
            <Field label="Newsletter title"><Input value={value.newsletter_title ?? ""} onChange={set("newsletter_title")} /></Field>
            <Field label="Newsletter text"><Input value={value.newsletter_text ?? ""} onChange={set("newsletter_text")} /></Field>
          </div>
          <JsonEditor
            label='Footer menus (JSON array: [{"title":"Product","links":[{"label":"Pricing","href":"/#pricing"}]}])'
            value={value.menus}
            onChange={(v) => onChange({ menus: v })}
          />
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Background color"><Input value={value.bg_color ?? ""} onChange={set("bg_color")} placeholder="#4E342E" /></Field>
            <Field label="Text color"><Input value={value.text_color ?? ""} onChange={set("text_color")} placeholder="#FBF7F2" /></Field>
            <Field label="Link color"><Input value={value.link_color ?? ""} onChange={set("link_color")} placeholder="#E7D8C6" /></Field>
            <Field label="Link hover color"><Input value={value.hover_color ?? ""} onChange={set("hover_color")} placeholder="#D4AF37" /></Field>
          </div>
          <p className="text-xs text-muted-foreground">Social icons come from the Social tab. Every public page uses this one footer.</p>
        </div>
      );

    case "blog":
      return (
        <div className="space-y-5">
          <div className={grid}>
            <Field label="Posts per page"><Input type="number" value={value.posts_per_page ?? ""} onChange={setNum("posts_per_page")} /></Field>
            <Field label="Default author"><Input value={value.default_author ?? ""} onChange={set("default_author")} /></Field>
            <Field label="Author image"><ImageUploadField value={value.author_image ?? ""} onChange={(v) => onChange({ author_image: v })} folder="settings/blog" /></Field>
            <Field label="Comment system">
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={value.comment_system ?? "none"} onChange={set("comment_system")}>
                <option value="none">None</option><option value="disqus">Disqus</option><option value="native">Native</option>
              </select>
            </Field>
          </div>
          <Field label="Author bio">
            <textarea
              className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={value.author_bio ?? ""}
              onChange={(e) => onChange({ author_bio: e.target.value })}
              placeholder="Short bio shown under each blog post (1-3 sentences)"
            />
          </Field>
          <div>
            <div className="mb-2 text-sm font-medium">Author social links</div>
            <div className={grid}>
              {["website","facebook","instagram","youtube","pinterest","x","threads","linkedin","tiktok","whatsapp","telegram","quora"].map((k) => (
                <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
                  <Input
                    value={(value.author_social ?? {})[k] ?? ""}
                    onChange={(e) => onChange({ author_social: { ...(value.author_social ?? {}), [k]: e.target.value } })}
                    placeholder="https://..."
                  />
                </Field>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!value.reading_time} onCheckedChange={setBool("reading_time")} /> Show reading time</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!value.related_posts} onCheckedChange={setBool("related_posts")} /> Related posts</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!value.social_sharing} onCheckedChange={setBool("social_sharing")} /> Social sharing</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!value.text_to_speech} onCheckedChange={setBool("text_to_speech")} /> Text-to-Speech</label>
          </div>
        </div>
      );

    case "announcement":
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Switch checked={!!value.enabled} onCheckedChange={setBool("enabled")} />
            <span className="text-sm">Enable announcement bar</span>
          </div>
          <Field label="Message"><Input value={value.message ?? ""} onChange={set("message")} /></Field>
          <div className={grid}>
            <Field label="Button label"><Input value={value.button_label ?? ""} onChange={set("button_label")} /></Field>
            <Field label="Button link"><Input value={value.button_href ?? ""} onChange={set("button_href")} /></Field>
            <Field label="Background color"><Input value={value.bg_color ?? ""} onChange={set("bg_color")} placeholder="#8B5E3C" /></Field>
            <Field label="Text color"><Input value={value.text_color ?? ""} onChange={set("text_color")} placeholder="#FFFFFF" /></Field>
            <Field label="Expires at (ISO datetime)"><Input value={value.expires_at ?? ""} onChange={set("expires_at")} placeholder="2026-12-31T00:00:00Z" /></Field>
          </div>
        </div>
      );

    case "security":
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Switch checked={!!value.maintenance_mode} onCheckedChange={setBool("maintenance_mode")} />
            <span className="text-sm">Maintenance mode</span>
          </div>
          <div className={grid}>
            <Field label="reCAPTCHA site key"><Input value={value.recaptcha_site_key ?? ""} onChange={set("recaptcha_site_key")} /></Field>
            <Field label="reCAPTCHA secret"><Input type="password" value={value.recaptcha_secret ?? ""} onChange={set("recaptcha_secret")} /></Field>
            <Field label="Turnstile site key"><Input value={value.turnstile_site_key ?? ""} onChange={set("turnstile_site_key")} /></Field>
            <Field label="Turnstile secret"><Input type="password" value={value.turnstile_secret ?? ""} onChange={set("turnstile_secret")} /></Field>
            <Field label="Rate limit / min"><Input type="number" value={value.rate_limit_per_min ?? ""} onChange={setNum("rate_limit_per_min")} /></Field>
            <Field label="Session timeout (min)"><Input type="number" value={value.session_timeout_minutes ?? ""} onChange={setNum("session_timeout_minutes")} /></Field>
            <Field label="Max login attempts"><Input type="number" value={value.max_login_attempts ?? ""} onChange={setNum("max_login_attempts")} /></Field>
            <Field label="Password min length"><Input type="number" value={value.password_policy?.min_length ?? ""} onChange={(e) => onChange({ password_policy: { ...(value.password_policy ?? {}), min_length: Number(e.target.value) } })} /></Field>
          </div>
          <Field label="Allowed domains (comma-separated)">
            <Input
              value={(value.allowed_domains ?? []).join(", ")}
              onChange={(e) => onChange({ allowed_domains: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
        </div>
      );

    case "media":
      return (
        <div className="space-y-5">
          <div className={grid}>
            <Field label="Max upload (MB)"><Input type="number" value={value.max_upload_mb ?? ""} onChange={setNum("max_upload_mb")} /></Field>
            <Field label="Image compression (0–100)"><Input type="number" value={value.image_compression ?? ""} onChange={setNum("image_compression")} /></Field>
            <Field label="Image max dimension (px)"><Input type="number" value={value.image_max_dimension ?? ""} onChange={setNum("image_max_dimension")} /></Field>
            <Field label="Watermark image"><ImageUploadField value={value.watermark_url ?? ""} onChange={(v) => onChange({ watermark_url: v })} folder="settings/watermark" /></Field>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={!!value.watermark_enabled} onCheckedChange={setBool("watermark_enabled")} />
            <span className="text-sm">Watermark uploads</span>
          </div>
          <Field label="Allowed MIME types (comma-separated)">
            <Input
              value={(value.allowed_types ?? []).join(", ")}
              onChange={(e) => onChange({ allowed_types: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
          <Field label="Thumbnail sizes (comma-separated px)">
            <Input
              value={(value.thumbnail_sizes ?? []).join(", ")}
              onChange={(e) => onChange({ thumbnail_sizes: e.target.value.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n)) })}
            />
          </Field>
        </div>
      );

    case "legal":
      return (
        <div className="space-y-5">
          {["privacy_policy","terms","cookie_policy","disclaimer","refund_policy","shipping_policy"].map((k) => (
            <Field key={k} label={k.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())}>
              <Textarea rows={5} value={value[k] ?? ""} onChange={set(k)} />
            </Field>
          ))}
        </div>
      );

    default:
      return <JsonEditor label="JSON" value={value} onChange={(v) => onChange(v as Record<string, any>)} />;
  }
}

function JsonEditor({ label, value, onChange }: { label: string; value: any; onChange: (v: any) => void }) {
  const initial = useMemo(() => JSON.stringify(value ?? [], null, 2), []);
  const [text, setText] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea
        rows={6}
        className="font-mono text-xs"
        value={text}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          try {
            onChange(JSON.parse(t));
            setErr(null);
          } catch (e: any) {
            setErr(e.message);
          }
        }}
      />
      {err && <p className="text-xs text-destructive">Invalid JSON: {err}</p>}
    </div>
  );
}
