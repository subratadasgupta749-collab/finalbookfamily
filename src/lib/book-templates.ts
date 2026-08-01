/**
 * Book template design system.
 *
 * Every template is a complete publishing identity: typography stack, palette,
 * paper/background treatment, cover construction, chapter opener, drop cap,
 * divider ornament, quote style, timeline style and photo layout language.
 */

export type PhotoLayout =
  | "full"
  | "grid"
  | "collage"
  | "polaroid"
  | "rounded"
  | "vintage"
  | "borderless"
  | "magazine";

export type TimelineStyle = "vertical" | "horizontal" | "cards" | "journey" | "illustrated";
export type QuoteStyle = "center" | "side" | "box" | "handwritten" | "pull";
export type CoverStyle =
  | "plate"
  | "framed"
  | "masthead"
  | "fullbleed"
  | "polaroid"
  | "crest"
  | "typeonly"
  | "collage"
  | "illustrated"
  | "band";
export type DropCapStyle = "none" | "serif" | "boxed" | "script";
export type DividerStyle = "ornament" | "rule" | "dots" | "wave" | "tape" | "vine" | "block";
export type OpenerStyle = "numeral" | "photo" | "band" | "folio" | "ornament" | "split";

export type BookTemplateId =
  | "classic"
  | "vintage"
  | "modern"
  | "leather_journal"
  | "family_album"
  | "timeline_split"
  | "heritage"
  | "luxury_minimal"
  | "scrapbook"
  | "coffee_table"
  | "magazine"
  | "storybook";

export type BookTemplate = {
  id: BookTemplateId;
  label: string;
  description: string;
  typographyName: string;
  fonts: { display: string; body: string; script: string };
  palette: {
    paper: string;
    ink: string;
    muted: string;
    accent: string;
    accentSoft: string;
    rule: string;
    deep: string;
    coverInk: string;
  };
  /** CSS background layers painted on the page surface. */
  background: string;
  backgroundName: string;
  cover: CoverStyle;
  opener: OpenerStyle;
  dropCap: DropCapStyle;
  divider: DividerStyle;
  quote: QuoteStyle;
  timeline: TimelineStyle;
  photo: PhotoLayout;
  /** Body measure + rhythm. */
  measure: string;
  bodySize: string;
  bodyLeading: string;
  headingTracking: string;
  uppercaseLabels: boolean;
};

const NONE = "none";

export const BOOK_TEMPLATES: BookTemplate[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Timeless trade-hardcover typography, centred title plate, gold rules.",
    typographyName: "Elegant Serif — Playfair Display / EB Garamond",
    fonts: {
      display: "'Playfair Display', Georgia, serif",
      body: "'EB Garamond', Georgia, serif",
      script: "'Cormorant Garamond', Georgia, serif",
    },
    palette: {
      paper: "#FFFBF5",
      ink: "#2B2118",
      muted: "#7A6A58",
      accent: "#8B5E3C",
      accentSoft: "rgba(139,94,60,0.10)",
      rule: "rgba(212,175,55,0.55)",
      deep: "#4A3423",
      coverInk: "#FFF7EA",
    },
    background: NONE,
    backgroundName: "Plain white",
    cover: "plate",
    opener: "numeral",
    dropCap: "serif",
    divider: "ornament",
    quote: "center",
    timeline: "vertical",
    photo: "rounded",
    measure: "34rem",
    bodySize: "1.0625rem",
    bodyLeading: "1.85",
    headingTracking: "-0.01em",
    uppercaseLabels: true,
  },
  {
    id: "vintage",
    label: "Vintage",
    description: "Aged paper, letterpress typewriter accents, hand-tinted photo frames.",
    typographyName: "Old Book — Special Elite / Lora",
    fonts: {
      display: "'Special Elite', 'Courier New', serif",
      body: "'Lora', Georgia, serif",
      script: "'Caveat', cursive",
    },
    palette: {
      paper: "#F6E7CE",
      ink: "#3B2614",
      muted: "#8A6A46",
      accent: "#A0522D",
      accentSoft: "rgba(160,82,45,0.12)",
      rule: "rgba(122,61,26,0.45)",
      deep: "#5C3317",
      coverInk: "#F8EFD9",
    },
    background:
      "radial-gradient(circle at 12% 18%, rgba(146,104,58,0.16), transparent 42%), radial-gradient(circle at 84% 76%, rgba(120,80,40,0.14), transparent 48%), repeating-linear-gradient(0deg, rgba(120,80,40,0.045) 0 2px, transparent 2px 5px)",
    backgroundName: "Old paper",
    cover: "framed",
    opener: "ornament",
    dropCap: "boxed",
    divider: "dots",
    quote: "handwritten",
    timeline: "illustrated",
    photo: "vintage",
    measure: "33rem",
    bodySize: "1.0625rem",
    bodyLeading: "1.9",
    headingTracking: "0.02em",
    uppercaseLabels: true,
  },
  {
    id: "modern",
    label: "Modern",
    description: "Swiss grid, generous white space, hairline rules, borderless photography.",
    typographyName: "Minimal Sans — Space Grotesk / Inter",
    fonts: {
      display: "'Space Grotesk', Inter, sans-serif",
      body: "Inter, system-ui, sans-serif",
      script: "Inter, system-ui, sans-serif",
    },
    palette: {
      paper: "#FFFFFF",
      ink: "#111111",
      muted: "#8A8A8A",
      accent: "#111111",
      accentSoft: "rgba(17,17,17,0.06)",
      rule: "rgba(17,17,17,0.18)",
      deep: "#000000",
      coverInk: "#FFFFFF",
    },
    background: NONE,
    backgroundName: "Minimal",
    cover: "masthead",
    opener: "band",
    dropCap: "none",
    divider: "rule",
    quote: "pull",
    timeline: "horizontal",
    photo: "borderless",
    measure: "36rem",
    bodySize: "1rem",
    bodyLeading: "1.8",
    headingTracking: "-0.03em",
    uppercaseLabels: true,
  },
  {
    id: "leather_journal",
    label: "Leather Journal",
    description: "Debossed leather cover, handwritten marginalia, tipped-in polaroids.",
    typographyName: "Handwritten + Serif — Cinzel / Caveat / Lora",
    fonts: {
      display: "'Cinzel', Georgia, serif",
      body: "'Lora', Georgia, serif",
      script: "'Caveat', cursive",
    },
    palette: {
      paper: "#F2E3C8",
      ink: "#33210F",
      muted: "#7B5C3A",
      accent: "#6B3F1D",
      accentSoft: "rgba(107,63,29,0.12)",
      rule: "rgba(107,63,29,0.45)",
      deep: "#3E240E",
      coverInk: "#EBD7B4",
    },
    background:
      "radial-gradient(circle at 25% 25%, rgba(90,54,24,0.12), transparent 45%), repeating-linear-gradient(135deg, rgba(90,54,24,0.05) 0 3px, transparent 3px 8px)",
    backgroundName: "Leather texture",
    cover: "band",
    opener: "folio",
    dropCap: "script",
    divider: "wave",
    quote: "side",
    timeline: "cards",
    photo: "polaroid",
    measure: "33rem",
    bodySize: "1.0625rem",
    bodyLeading: "1.9",
    headingTracking: "0.08em",
    uppercaseLabels: true,
  },
  {
    id: "family_album",
    label: "Family Album",
    description: "Photo-forward album pages, taped corners, warm captions.",
    typographyName: "Warm Editorial — Fraunces / Inter",
    fonts: {
      display: "Fraunces, Georgia, serif",
      body: "Inter, system-ui, sans-serif",
      script: "'Caveat', cursive",
    },
    palette: {
      paper: "#FFFCF6",
      ink: "#22252E",
      muted: "#6D7280",
      accent: "#C08A2E",
      accentSoft: "rgba(192,138,46,0.14)",
      rule: "rgba(192,138,46,0.5)",
      deep: "#1B1E26",
      coverInk: "#FFFDF8",
    },
    background:
      "repeating-linear-gradient(45deg, rgba(0,0,0,0.018) 0 6px, transparent 6px 12px)",
    backgroundName: "Fabric texture",
    cover: "polaroid",
    opener: "photo",
    dropCap: "none",
    divider: "tape",
    quote: "box",
    timeline: "cards",
    photo: "collage",
    measure: "35rem",
    bodySize: "1rem",
    bodyLeading: "1.8",
    headingTracking: "-0.01em",
    uppercaseLabels: false,
  },
  {
    id: "timeline_split",
    label: "Timeline Split",
    description: "Alternating photo/story spreads threaded on a continuous life line.",
    typographyName: "Editorial Serif — Fraunces / Lora",
    fonts: {
      display: "Fraunces, Georgia, serif",
      body: "'Lora', Georgia, serif",
      script: "'Cormorant Garamond', serif",
    },
    palette: {
      paper: "#FAF6F2",
      ink: "#241C15",
      muted: "#7A6A58",
      accent: "#8B5E3C",
      accentSoft: "rgba(139,94,60,0.10)",
      rule: "rgba(139,94,60,0.45)",
      deep: "#4A3423",
      coverInk: "#FBF7F3",
    },
    background: NONE,
    backgroundName: "Plain",
    cover: "framed",
    opener: "split",
    dropCap: "serif",
    divider: "rule",
    quote: "side",
    timeline: "journey",
    photo: "grid",
    measure: "34rem",
    bodySize: "1.0625rem",
    bodyLeading: "1.85",
    headingTracking: "-0.01em",
    uppercaseLabels: true,
  },
  {
    id: "heritage",
    label: "Heritage",
    description: "Parchment, engraved capitals, crest cover and archival plate captions.",
    typographyName: "Engraved Classical — Cinzel / EB Garamond",
    fonts: {
      display: "'Cinzel', Georgia, serif",
      body: "'EB Garamond', Georgia, serif",
      script: "'Cormorant Garamond', serif",
    },
    palette: {
      paper: "#F5EFE2",
      ink: "#2A241A",
      muted: "#7C6E56",
      accent: "#8A6B25",
      accentSoft: "rgba(138,107,37,0.12)",
      rule: "rgba(138,107,37,0.55)",
      deep: "#3B3323",
      coverInk: "#F2E9D6",
    },
    background:
      "radial-gradient(circle at 50% 0%, rgba(138,107,37,0.10), transparent 55%), repeating-linear-gradient(90deg, rgba(90,74,40,0.035) 0 1px, transparent 1px 14px)",
    backgroundName: "Vintage pattern",
    cover: "crest",
    opener: "ornament",
    dropCap: "boxed",
    divider: "ornament",
    quote: "center",
    timeline: "vertical",
    photo: "vintage",
    measure: "33rem",
    bodySize: "1.0625rem",
    bodyLeading: "1.9",
    headingTracking: "0.12em",
    uppercaseLabels: true,
  },
  {
    id: "luxury_minimal",
    label: "Luxury Minimal",
    description: "Ivory, hairlines and vast air. Type-only cover, silent full-bleed plates.",
    typographyName: "Luxury Display — Italiana / Inter Light",
    fonts: {
      display: "'Italiana', Georgia, serif",
      body: "Inter, system-ui, sans-serif",
      script: "'Cormorant Garamond', serif",
    },
    palette: {
      paper: "#FBFAF7",
      ink: "#1A1A18",
      muted: "#9A968D",
      accent: "#1A1A18",
      accentSoft: "rgba(26,26,24,0.05)",
      rule: "rgba(26,26,24,0.22)",
      deep: "#000000",
      coverInk: "#F7F5F0",
    },
    background: NONE,
    backgroundName: "Minimal",
    cover: "typeonly",
    opener: "folio",
    dropCap: "none",
    divider: "rule",
    quote: "center",
    timeline: "horizontal",
    photo: "full",
    measure: "32rem",
    bodySize: "1rem",
    bodyLeading: "2",
    headingTracking: "0.3em",
    uppercaseLabels: true,
  },
  {
    id: "scrapbook",
    label: "Scrapbook Memories",
    description: "Layered paper, washi tape, handwriting and pinned polaroid clusters.",
    typographyName: "Handwritten — Caveat / Nunito-style sans",
    fonts: {
      display: "'Caveat', cursive",
      body: "Inter, system-ui, sans-serif",
      script: "'Caveat', cursive",
    },
    palette: {
      paper: "#FFF9F0",
      ink: "#33302B",
      muted: "#8C8377",
      accent: "#C2643F",
      accentSoft: "rgba(194,100,63,0.14)",
      rule: "rgba(194,100,63,0.45)",
      deep: "#5A4632",
      coverInk: "#FFFBF4",
    },
    background:
      "radial-gradient(circle at 18% 12%, rgba(214,158,120,0.18), transparent 38%), radial-gradient(circle at 82% 84%, rgba(150,178,150,0.16), transparent 42%), repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0 1px, transparent 1px 22px)",
    backgroundName: "Soft floral",
    cover: "collage",
    opener: "photo",
    dropCap: "script",
    divider: "tape",
    quote: "handwritten",
    timeline: "illustrated",
    photo: "polaroid",
    measure: "34rem",
    bodySize: "1rem",
    bodyLeading: "1.8",
    headingTracking: "0em",
    uppercaseLabels: false,
  },
  {
    id: "coffee_table",
    label: "Coffee Table Book",
    description: "Oversized full-bleed photography, Bodoni display, gallery captions.",
    typographyName: "Luxury Typography — Bodoni Moda / Archivo",
    fonts: {
      display: "'Bodoni Moda', Didot, serif",
      body: "'Archivo', Inter, sans-serif",
      script: "'Cormorant Garamond', serif",
    },
    palette: {
      paper: "#F3F2EF",
      ink: "#16161A",
      muted: "#7E7E86",
      accent: "#16161A",
      accentSoft: "rgba(22,22,26,0.06)",
      rule: "rgba(22,22,26,0.28)",
      deep: "#0B0B0D",
      coverInk: "#F7F6F3",
    },
    background: NONE,
    backgroundName: "Photo background",
    cover: "fullbleed",
    opener: "photo",
    dropCap: "none",
    divider: "block",
    quote: "pull",
    timeline: "horizontal",
    photo: "full",
    measure: "36rem",
    bodySize: "1.0625rem",
    bodyLeading: "1.8",
    headingTracking: "-0.02em",
    uppercaseLabels: true,
  },
  {
    id: "magazine",
    label: "Magazine Style",
    description: "Masthead cover, multi-column features, kickers, boxed pull quotes.",
    typographyName: "Editorial Grotesk — Archivo Black / Inter",
    fonts: {
      display: "'Archivo', Inter, sans-serif",
      body: "Inter, system-ui, sans-serif",
      script: "'Lora', Georgia, serif",
    },
    palette: {
      paper: "#FFFFFF",
      ink: "#131417",
      muted: "#75777E",
      accent: "#B3402B",
      accentSoft: "rgba(179,64,43,0.10)",
      rule: "rgba(19,20,23,0.85)",
      deep: "#131417",
      coverInk: "#FFFFFF",
    },
    background: NONE,
    backgroundName: "Plain white",
    cover: "masthead",
    opener: "band",
    dropCap: "boxed",
    divider: "block",
    quote: "pull",
    timeline: "cards",
    photo: "magazine",
    measure: "36rem",
    bodySize: "1rem",
    bodyLeading: "1.75",
    headingTracking: "-0.03em",
    uppercaseLabels: true,
  },
  {
    id: "storybook",
    label: "Storybook",
    description: "Watercolour washes, calligraphic titles, illustrated journey timeline.",
    typographyName: "Elegant Calligraphy — Pinyon Script / Lora",
    fonts: {
      display: "'Pinyon Script', cursive",
      body: "'Lora', Georgia, serif",
      script: "'Pinyon Script', cursive",
    },
    palette: {
      paper: "#FDFBF7",
      ink: "#2E2A33",
      muted: "#857E8C",
      accent: "#7A6BA8",
      accentSoft: "rgba(122,107,168,0.12)",
      rule: "rgba(122,107,168,0.45)",
      deep: "#4A4258",
      coverInk: "#FCFAFF",
    },
    background:
      "radial-gradient(circle at 20% 20%, rgba(160,180,220,0.22), transparent 45%), radial-gradient(circle at 78% 30%, rgba(228,180,196,0.20), transparent 40%), radial-gradient(circle at 50% 88%, rgba(190,214,186,0.20), transparent 46%)",
    backgroundName: "Watercolour",
    cover: "illustrated",
    opener: "ornament",
    dropCap: "script",
    divider: "vine",
    quote: "center",
    timeline: "journey",
    photo: "rounded",
    measure: "33rem",
    bodySize: "1.0625rem",
    bodyLeading: "1.9",
    headingTracking: "0.01em",
    uppercaseLabels: false,
  },
];

export const TEMPLATES_BY_ID = Object.fromEntries(
  BOOK_TEMPLATES.map((t) => [t.id, t]),
) as Record<BookTemplateId, BookTemplate>;

export function getTemplate(id?: string | null): BookTemplate {
  return TEMPLATES_BY_ID[(id ?? "classic") as BookTemplateId] ?? TEMPLATES_BY_ID.classic;
}

/* ---------------- Customisation ---------------- */

export const PAGE_SIZES = {
  a4: { label: "A4", w: 210, h: 297 },
  letter: { label: "US Letter", w: 216, h: 279 },
  book: { label: "Book (6 × 9 in)", w: 152, h: 229 },
} as const;
export type PageSizeId = keyof typeof PAGE_SIZES;

export const PHOTO_LAYOUT_OPTIONS: Array<{ id: PhotoLayout; label: string }> = [
  { id: "full", label: "Single full page" },
  { id: "grid", label: "Four grid" },
  { id: "collage", label: "Collage" },
  { id: "polaroid", label: "Polaroid" },
  { id: "rounded", label: "Rounded" },
  { id: "vintage", label: "Vintage frames" },
  { id: "borderless", label: "Borderless" },
  { id: "magazine", label: "Magazine" },
];

export const TIMELINE_OPTIONS: Array<{ id: TimelineStyle; label: string }> = [
  { id: "vertical", label: "Vertical" },
  { id: "horizontal", label: "Horizontal" },
  { id: "cards", label: "Milestone cards" },
  { id: "journey", label: "Family journey" },
  { id: "illustrated", label: "Illustrated" },
];

export const QUOTE_OPTIONS: Array<{ id: QuoteStyle; label: string }> = [
  { id: "center", label: "Large centre quote" },
  { id: "side", label: "Side quote" },
  { id: "box", label: "Highlight box" },
  { id: "handwritten", label: "Handwritten" },
  { id: "pull", label: "Pull quote" },
];

export const BACKGROUND_OPTIONS: Array<{ id: string; label: string; css: string }> = [
  { id: "template", label: "Template default", css: "" },
  { id: "plain", label: "Plain white", css: NONE },
  {
    id: "oldpaper",
    label: "Old paper",
    css: "radial-gradient(circle at 12% 18%, rgba(146,104,58,0.16), transparent 42%), repeating-linear-gradient(0deg, rgba(120,80,40,0.05) 0 2px, transparent 2px 5px)",
  },
  {
    id: "textured",
    label: "Textured paper",
    css: "repeating-linear-gradient(0deg, rgba(0,0,0,0.022) 0 1px, transparent 1px 4px)",
  },
  {
    id: "fabric",
    label: "Fabric",
    css: "repeating-linear-gradient(45deg, rgba(0,0,0,0.02) 0 6px, transparent 6px 12px)",
  },
  {
    id: "leather",
    label: "Leather",
    css: "radial-gradient(circle at 25% 25%, rgba(90,54,24,0.14), transparent 45%), repeating-linear-gradient(135deg, rgba(90,54,24,0.05) 0 3px, transparent 3px 8px)",
  },
  {
    id: "watercolor",
    label: "Watercolour",
    css: "radial-gradient(circle at 20% 20%, rgba(160,180,220,0.22), transparent 45%), radial-gradient(circle at 78% 30%, rgba(228,180,196,0.20), transparent 40%)",
  },
  {
    id: "floral",
    label: "Soft floral",
    css: "radial-gradient(circle at 18% 12%, rgba(214,158,120,0.18), transparent 38%), radial-gradient(circle at 82% 84%, rgba(150,178,150,0.16), transparent 42%)",
  },
  {
    id: "vintagepattern",
    label: "Vintage pattern",
    css: "repeating-linear-gradient(90deg, rgba(90,74,40,0.04) 0 1px, transparent 1px 14px)",
  },
];

export const FONT_PAIR_OPTIONS: Array<{
  id: string;
  label: string;
  display: string;
  body: string;
}> = [
  { id: "template", label: "Template default", display: "", body: "" },
  {
    id: "playfair-garamond",
    label: "Playfair / EB Garamond",
    display: "'Playfair Display', Georgia, serif",
    body: "'EB Garamond', Georgia, serif",
  },
  {
    id: "cinzel-garamond",
    label: "Cinzel / EB Garamond",
    display: "'Cinzel', Georgia, serif",
    body: "'EB Garamond', Georgia, serif",
  },
  {
    id: "bodoni-archivo",
    label: "Bodoni Moda / Archivo",
    display: "'Bodoni Moda', Didot, serif",
    body: "'Archivo', Inter, sans-serif",
  },
  {
    id: "grotesk-inter",
    label: "Space Grotesk / Inter",
    display: "'Space Grotesk', Inter, sans-serif",
    body: "Inter, system-ui, sans-serif",
  },
  {
    id: "italiana-inter",
    label: "Italiana / Inter",
    display: "'Italiana', Georgia, serif",
    body: "Inter, system-ui, sans-serif",
  },
  {
    id: "caveat-lora",
    label: "Caveat / Lora",
    display: "'Caveat', cursive",
    body: "'Lora', Georgia, serif",
  },
  {
    id: "pinyon-lora",
    label: "Pinyon Script / Lora",
    display: "'Pinyon Script', cursive",
    body: "'Lora', Georgia, serif",
  },
];

export type BookCustomisation = {
  fontPair: string;
  accent: string;
  paper: string;
  background: string;
  photoLayout: PhotoLayout | "template";
  timeline: TimelineStyle | "template";
  quote: QuoteStyle | "template";
  pageSize: PageSizeId;
  margin: number; // mm
  showHeader: boolean;
  showFooter: boolean;
  bleed: boolean;
  coverPhotoId: string | "auto";
  dedication: string;
  familyQuote: string;
  thankYou: string;
};

export const DEFAULT_CUSTOMISATION: BookCustomisation = {
  fontPair: "template",
  accent: "",
  paper: "",
  background: "template",
  photoLayout: "template",
  timeline: "template",
  quote: "template",
  pageSize: "book",
  margin: 20,
  showHeader: true,
  showFooter: true,
  bleed: false,
  coverPhotoId: "auto",
  dedication: "",
  familyQuote: "",
  thankYou: "",
};

/** Resolve a template + user customisation into the final design tokens. */
export function resolveDesign(template: BookTemplate, c: BookCustomisation) {
  const pair = FONT_PAIR_OPTIONS.find((f) => f.id === c.fontPair);
  const bg = BACKGROUND_OPTIONS.find((b) => b.id === c.background);
  return {
    ...template,
    fonts: {
      ...template.fonts,
      display: pair?.display || template.fonts.display,
      body: pair?.body || template.fonts.body,
    },
    palette: {
      ...template.palette,
      accent: c.accent || template.palette.accent,
      paper: c.paper || template.palette.paper,
    },
    background: bg && bg.id !== "template" ? bg.css : template.background,
    photo: c.photoLayout === "template" ? template.photo : c.photoLayout,
    timeline: c.timeline === "template" ? template.timeline : c.timeline,
    quote: c.quote === "template" ? template.quote : c.quote,
  } as BookTemplate;
}
