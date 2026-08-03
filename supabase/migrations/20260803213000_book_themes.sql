-- ============================================================
-- Migration: Dynamic Book Themes System
-- ============================================================

-- Convert book_manuscripts.theme column from Postgres enum to text to support dynamic themes
ALTER TABLE public.book_manuscripts 
  ALTER COLUMN theme TYPE text USING theme::text;

ALTER TABLE public.book_manuscripts 
  ALTER COLUMN theme SET DEFAULT 'classic';

-- 1) Create book_themes table
CREATE TABLE IF NOT EXISTS public.book_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  cover_design text NOT NULL DEFAULT 'plate',
  typography_name text,
  fonts jsonb NOT NULL DEFAULT '{"display": "Playfair Display, serif", "body": "EB Garamond, serif", "script": "Cormorant Garamond, serif"}'::jsonb,
  color_palette jsonb NOT NULL DEFAULT '{"paper": "#FFFBF5", "ink": "#2B2118", "muted": "#7A6A58", "accent": "#8B5E3C", "accentSoft": "rgba(139,94,60,0.10)", "rule": "rgba(212,175,55,0.55)", "deep": "#4A3423", "coverInk": "#FFF7EA"}'::jsonb,
  background_style text NOT NULL DEFAULT 'none',
  background_name text NOT NULL DEFAULT 'Plain white',
  header_style text NOT NULL DEFAULT 'standard',
  footer_style text NOT NULL DEFAULT 'standard',
  chapter_style text NOT NULL DEFAULT 'numeral',
  timeline_style text NOT NULL DEFAULT 'vertical',
  photo_layout text NOT NULL DEFAULT 'rounded',
  quote_style text NOT NULL DEFAULT 'center',
  divider_style text NOT NULL DEFAULT 'ornament',
  page_number_style text NOT NULL DEFAULT 'bottom-center',
  toc_style text NOT NULL DEFAULT 'classic',
  cover_layout text NOT NULL DEFAULT 'standard',
  back_cover_layout text NOT NULL DEFAULT 'standard',
  print_settings jsonb NOT NULL DEFAULT '{"pageSize": "trade", "margins": "standard", "bleedMm": 3}'::jsonb,
  cover_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_themes TO authenticated;
GRANT SELECT ON public.book_themes TO anon;
GRANT ALL ON public.book_themes TO service_role;

ALTER TABLE public.book_themes ENABLE ROW LEVEL SECURITY;

-- Everyone can read enabled themes; Admins can read all themes
CREATE POLICY "Public can view enabled book_themes" ON public.book_themes
  FOR SELECT TO anon, authenticated
  USING (is_enabled = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manage book_themes" ON public.book_themes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto update updated_at
CREATE TRIGGER trg_book_themes_updated
  BEFORE UPDATE ON public.book_themes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Create theme_settings table
CREATE TABLE IF NOT EXISTS public.theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES public.book_themes(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(theme_id, setting_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.theme_settings TO authenticated;
GRANT SELECT ON public.theme_settings TO anon;
GRANT ALL ON public.theme_settings TO service_role;

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view theme_settings" ON public.theme_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin manage theme_settings" ON public.theme_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_theme_settings_updated
  BEFORE UPDATE ON public.theme_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Create theme_assets table
CREATE TABLE IF NOT EXISTS public.theme_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES public.book_themes(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  file_url text NOT NULL,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.theme_assets TO authenticated;
GRANT SELECT ON public.theme_assets TO anon;
GRANT ALL ON public.theme_assets TO service_role;

ALTER TABLE public.theme_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view theme_assets" ON public.theme_assets
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin manage theme_assets" ON public.theme_assets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Create theme_preview_images table
CREATE TABLE IF NOT EXISTS public.theme_preview_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES public.book_themes(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.theme_preview_images TO authenticated;
GRANT SELECT ON public.theme_preview_images TO anon;
GRANT ALL ON public.theme_preview_images TO service_role;

ALTER TABLE public.theme_preview_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view theme_preview_images" ON public.theme_preview_images
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin manage theme_preview_images" ON public.theme_preview_images
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed initial themes from BOOK_TEMPLATES
INSERT INTO public.book_themes (
  slug, name, description, is_enabled, is_default, display_order,
  cover_design, typography_name, fonts, color_palette, background_style, background_name,
  chapter_style, timeline_style, photo_layout, quote_style, divider_style
) VALUES
(
  'classic', 'Classic', 'Timeless trade-hardcover typography, centred title plate, gold rules.', true, true, 1,
  'plate', 'Elegant Serif — Playfair Display / EB Garamond',
  '{"display": "\''Playfair Display\'', Georgia, serif", "body": "\''EB Garamond\'', Georgia, serif", "script": "\''Cormorant Garamond\'', Georgia, serif"}'::jsonb,
  '{"paper": "#FFFBF5", "ink": "#2B2118", "muted": "#7A6A58", "accent": "#8B5E3C", "accentSoft": "rgba(139,94,60,0.10)", "rule": "rgba(212,175,55,0.55)", "deep": "#4A3423", "coverInk": "#FFF7EA"}'::jsonb,
  'none', 'Plain white', 'numeral', 'vertical', 'rounded', 'center', 'ornament'
),
(
  'vintage', 'Vintage', 'Aged paper, letterpress typewriter accents, hand-tinted photo frames.', true, false, 2,
  'framed', 'Old Book — Special Elite / Lora',
  '{"display": "\''Special Elite\'', \'\'Courier New\'\', serif", "body": "\''Lora\'', Georgia, serif", "script": "\''Caveat\'', cursive"}'::jsonb,
  '{"paper": "#F6E7CE", "ink": "#3B2614", "muted": "#8A6A46", "accent": "#A0522D", "accentSoft": "rgba(160,82,45,0.12)", "rule": "rgba(122,61,26,0.45)", "deep": "#5C3317", "coverInk": "#F8EFD9"}'::jsonb,
  'radial-gradient(circle at 12% 18%, rgba(146,104,58,0.16), transparent 42%), repeating-linear-gradient(0deg, rgba(120,80,40,0.045) 0 2px, transparent 2px 5px)', 'Old paper', 'ornament', 'illustrated', 'vintage', 'handwritten', 'dots'
),
(
  'modern', 'Modern', 'Swiss grid, high contrast, hairlines, borderless photographic plates.', true, false, 3,
  'typeonly', 'Architectural Modern — Inter / Plus Jakarta Sans',
  '{"display": "\''Plus Jakarta Sans\'', system-ui, sans-serif", "body": "\''Inter\'', system-ui, sans-serif", "script": "\''Playfair Display\'', serif"}'::jsonb,
  '{"paper": "#FFFFFF", "ink": "#0F172A", "muted": "#64748B", "accent": "#2563EB", "accentSoft": "rgba(37,99,235,0.08)", "rule": "#E2E8F0", "deep": "#0F172A", "coverInk": "#F8FAFC"}'::jsonb,
  'none', 'Pure white', 'folio', 'journey', 'borderless', 'pull', 'rule'
),
(
  'leather_journal', 'Leather Journal', 'Rich debossed cover look, handwriting touches, tipped-in polaroids.', true, false, 4,
  'band', 'Handwritten Keepsake — Caveat / Lora',
  '{"display": "\''Caveat\'', cursive", "body": "\''Lora\'', Georgia, serif", "script": "\''Caveat\'', cursive"}'::jsonb,
  '{"paper": "#FDF6E3", "ink": "#2D2013", "muted": "#7A6854", "accent": "#C05621", "accentSoft": "rgba(192,86,33,0.12)", "rule": "rgba(180,120,60,0.30)", "deep": "#3D2314", "coverInk": "#FDF6E3"}'::jsonb,
  'none', 'Warm parchment', 'band', 'cards', 'polaroid', 'box', 'tape'
),
(
  'family_album', 'Family Album', 'Photo-forward layout, corner mounts, album captions.', true, false, 5,
  'collage', 'Album Serif — Merriweather',
  '{"display": "\''Merriweather\'', serif", "body": "\''Merriweather\'', serif", "script": "\''Caveat\'', cursive"}'::jsonb,
  '{"paper": "#FAF6F0", "ink": "#1F2937", "muted": "#6B7280", "accent": "#D97706", "accentSoft": "rgba(217,119,6,0.10)", "rule": "#E5E7EB", "deep": "#1F2937", "coverInk": "#FAF6F0"}'::jsonb,
  'none', 'Off-white', 'photo', 'vertical', 'collage', 'side', 'rule'
),
(
  'timeline_split', 'Timeline Split', 'Timeline-focused editorial grid with split spreads.', true, false, 6,
  'masthead', 'Editorial Sans — Space Grotesk / Inter',
  '{"display": "\''Space Grotesk\'', sans-serif", "body": "\''Inter\'', sans-serif", "script": "\''Playfair Display\'', serif"}'::jsonb,
  '{"paper": "#F8FAFC", "ink": "#0F172A", "muted": "#475569", "accent": "#0D9488", "accentSoft": "rgba(13,148,136,0.10)", "rule": "#CBD5E1", "deep": "#0F172A", "coverInk": "#F8FAFC"}'::jsonb,
  'none', 'Soft gray-blue', 'split', 'journey', 'grid', 'pull', 'wave'
),
(
  'heritage', 'Heritage', 'Deep gold borders, illuminated drop caps, traditional family crest style.', true, false, 7,
  'crest', 'Royal Serif — Cinzel / EB Garamond',
  '{"display": "\''Cinzel\'', serif", "body": "\''EB Garamond\'', serif", "script": "\''Cormorant Garamond\'', serif"}'::jsonb,
  '{"paper": "#FAF4E8", "ink": "#1C120C", "muted": "#6E5B4B", "accent": "#B45309", "accentSoft": "rgba(180,83,9,0.12)", "rule": "rgba(217,119,6,0.40)", "deep": "#2C1B10", "coverInk": "#FAF4E8"}'::jsonb,
  'none', 'Ivory heritage', 'ornament', 'vertical', 'rounded', 'center', 'vine'
),
(
  'luxury_minimal', 'Luxury Minimal', 'Generous margins, deep black & ivory palette, haute couture typographic spacing.', true, false, 8,
  'typeonly', 'Couture Serif — Cormorant Garamond',
  '{"display": "\''Cormorant Garamond\'', serif", "body": "\''Cormorant Garamond\'', serif", "script": "\''Cormorant Garamond\'', serif"}'::jsonb,
  '{"paper": "#FFFFFC", "ink": "#111111", "muted": "#777777", "accent": "#333333", "accentSoft": "rgba(0,0,0,0.05)", "rule": "#E5E5E5", "deep": "#111111", "coverInk": "#FFFFFF"}'::jsonb,
  'none', 'Ivory', 'numeral', 'horizontal', 'full', 'center', 'block'
),
(
  'scrapbook', 'Scrapbook Memories', 'Layered textures, tape accents, polaroid memories.', true, false, 9,
  'polaroid', 'Scrapbook — Caveat / Lora',
  '{"display": "\''Caveat\'', cursive", "body": "\''Lora\'', Georgia, serif", "script": "\''Caveat\'', cursive"}'::jsonb,
  '{"paper": "#FDF8F0", "ink": "#332211", "muted": "#776655", "accent": "#E07A5F", "accentSoft": "rgba(224,122,95,0.12)", "rule": "#E0C3A8", "deep": "#3D2B1F", "coverInk": "#FDF8F0"}'::jsonb,
  'none', 'Scrapbook warm', 'photo', 'cards', 'polaroid', 'handwritten', 'tape'
),
(
  'coffee_table', 'Coffee Table Book', 'Oversized full-bleed plates and modern display serif.', true, false, 10,
  'fullbleed', 'Display Bodoni — Playfair Display / Inter',
  '{"display": "\''Playfair Display\'', serif", "body": "\''Inter\'', sans-serif", "script": "\''Playfair Display\'', serif"}'::jsonb,
  '{"paper": "#F9FAFB", "ink": "#111827", "muted": "#4B5563", "accent": "#6366F1", "accentSoft": "rgba(99,102,241,0.10)", "rule": "#E5E7EB", "deep": "#111827", "coverInk": "#F9FAFB"}'::jsonb,
  'none', 'Clean gallery', 'folio', 'horizontal', 'magazine', 'pull', 'block'
),
(
  'magazine', 'Magazine Style', 'Bold mastheads, multi-column accents, pull quotes.', true, false, 11,
  'masthead', 'Magazine Modern — Space Grotesk / Lora',
  '{"display": "\''Space Grotesk\'', sans-serif", "body": "\''Lora\'', serif", "script": "\''Caveat\'', cursive"}'::jsonb,
  '{"paper": "#FFFFFF", "ink": "#18181B", "muted": "#71717A", "accent": "#DC2626", "accentSoft": "rgba(220,38,38,0.08)", "rule": "#E4E4E7", "deep": "#18181B", "coverInk": "#FFFFFF"}'::jsonb,
  'none', 'Magazine white', 'band', 'journey', 'magazine', 'box', 'rule'
),
(
  'storybook', 'Storybook', 'Warm calligraphic titles, soft washes, magical story style.', true, false, 12,
  'framed', 'Storybook Wash — Playfair Display / EB Garamond',
  '{"display": "\''Playfair Display\'', serif", "body": "\''EB Garamond\'', serif", "script": "\''Caveat\'', cursive"}'::jsonb,
  '{"paper": "#FFFDF7", "ink": "#2D261E", "muted": "#7C6F5E", "accent": "#7C3AED", "accentSoft": "rgba(124,58,237,0.10)", "rule": "#E9D5FF", "deep": "#2E1065", "coverInk": "#FFFDF7"}'::jsonb,
  'none', 'Soft warm wash', 'ornament', 'illustrated', 'rounded', 'center', 'vine'
)
ON CONFLICT (slug) DO NOTHING;
