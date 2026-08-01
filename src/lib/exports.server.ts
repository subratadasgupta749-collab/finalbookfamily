import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
} from "docx";

export const kindEnum = z.enum(["pdf", "docx", "print_pdf"]);
export type Kind = z.infer<typeof kindEnum>;

type ThemePalette = {
  bg: [number, number, number];
  ink: [number, number, number];
  accent: [number, number, number];
  muted: [number, number, number];
};

const THEME_PALETTES: Record<string, ThemePalette> = {
  classic: { bg: [1, 0.973, 0.949], ink: [0.13, 0.13, 0.13], accent: [0.545, 0.369, 0.235], muted: [0.4, 0.35, 0.3] },
  vintage: { bg: [0.98, 0.93, 0.85], ink: [0.24, 0.15, 0.08], accent: [0.6, 0.35, 0.15], muted: [0.45, 0.32, 0.2] },
  modern: { bg: [1, 1, 1], ink: [0.09, 0.09, 0.11], accent: [0.15, 0.15, 0.18], muted: [0.4, 0.4, 0.44] },
  leather_journal: { bg: [0.96, 0.9, 0.8], ink: [0.2, 0.12, 0.06], accent: [0.36, 0.2, 0.1], muted: [0.4, 0.28, 0.18] },
  family_album: { bg: [1, 0.988, 0.965], ink: [0.15, 0.18, 0.22], accent: [0.83, 0.69, 0.22], muted: [0.4, 0.42, 0.46] },
  timeline_split: { bg: [0.98, 0.965, 0.949], ink: [0.14, 0.11, 0.08], accent: [0.545, 0.369, 0.235], muted: [0.48, 0.42, 0.35] },
  heritage: { bg: [0.961, 0.937, 0.886], ink: [0.165, 0.141, 0.102], accent: [0.541, 0.42, 0.145], muted: [0.486, 0.431, 0.337] },
  luxury_minimal: { bg: [0.984, 0.98, 0.969], ink: [0.102, 0.102, 0.094], accent: [0.102, 0.102, 0.094], muted: [0.604, 0.588, 0.553] },
  scrapbook: { bg: [1, 0.976, 0.941], ink: [0.2, 0.188, 0.169], accent: [0.761, 0.392, 0.247], muted: [0.549, 0.514, 0.467] },
  coffee_table: { bg: [0.953, 0.949, 0.937], ink: [0.086, 0.086, 0.102], accent: [0.086, 0.086, 0.102], muted: [0.494, 0.494, 0.525] },
  magazine: { bg: [1, 1, 1], ink: [0.075, 0.078, 0.09], accent: [0.702, 0.251, 0.169], muted: [0.459, 0.467, 0.494] },
  storybook: { bg: [0.992, 0.984, 0.969], ink: [0.18, 0.165, 0.2], accent: [0.478, 0.42, 0.659], muted: [0.522, 0.494, 0.549] },
};

export async function loadBookData(supabase: any, bookId: string) {
  const { data: book, error: bErr } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .maybeSingle();
  if (bErr) throw new Error(bErr.message);
  if (!book) throw new Error("Book not found");

  const { data: manuscript } = await supabase
    .from("book_manuscripts")
    .select("*")
    .eq("book_id", bookId)
    .maybeSingle();

  const { data: chapters } = await supabase
    .from("book_chapters")
    .select("*")
    .eq("book_id", bookId)
    .order("position");

  // Photos (downloaded as bytes so they can be embedded in the PDF/DOCX)
  const { data: photoRows } = await supabase
    .from("photos")
    .select("*")
    .eq("book_id", bookId)
    .order("created_at", { ascending: true });

  const photos: BookPhoto[] = [];
  for (const p of (photoRows ?? []).slice(0, 40)) {
    try {
      const { data: blob } = await supabase.storage.from("photos").download(p.storage_path);
      if (!blob) continue;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const mime = (p.mime_type as string) || (blob as any).type || "";
      photos.push({
        id: p.id as string,
        category: p.category as string,
        caption: (p.caption as string) ?? null,
        mime,
        filename: p.filename as string,
        bytes,
      });
    } catch {
      /* skip unreadable photo */
    }
  }

  return {
    book,
    manuscript,
    photos,
    chapters: (chapters ?? []) as Array<{
      id: string;
      position: number;
      topic: string;
      title: string;
      narrative: string;
      timeline: Array<{ year: string; event: string }>;
      quotes: string[];
    }>,
  };
}

export type BookPhoto = {
  id: string;
  category: string;
  caption: string | null;
  mime: string;
  filename: string;
  bytes: Uint8Array;
};

/** Interview topic -> photo category (mirrors the preview page mapping). */
export const TOPIC_TO_CATEGORY: Record<string, string> = {
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

// --------- PDF ---------

// Standard PDF fonts only support WinAnsi. Strip/replace anything else so
// pdf-lib doesn't throw "cannot encode" while drawing text.
export function sanitizeWinAnsi(input: string): string {
  return (input ?? "")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/\t/g, "  ")
    .replace(/[^\n\x20-\x7E\xA1-\xFF]/g, "");
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = sanitizeWinAnsi(text).replace(/\r/g, "").split(/(\s+)/);

  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur + w;
    const width = font.widthOfTextAtSize(trial.replace(/\n/g, " "), size);
    if (width > maxWidth && cur.trim().length > 0) {
      lines.push(cur.trimEnd());
      cur = w.trimStart();
    } else {
      cur = trial;
    }
  }
  if (cur.length) lines.push(cur.trimEnd());
  // Split explicit newlines further
  const out: string[] = [];
  for (const l of lines) {
    const parts = l.split("\n");
    out.push(...parts);
  }
  return out;
}

export type ExportDesign = {
  /** hex colours resolved from template + user customisation */
  paper?: string;
  ink?: string;
  muted?: string;
  accent?: string;
  rule?: string;
  accentSoft?: string;
  background?: string;
  /** page size in mm */
  pageWidthMm?: number;
  pageHeightMm?: number;
  /** page margin in mm */
  marginMm?: number;
  /** font families (CSS strings) chosen in the preview */
  displayFont?: string;
  bodyFont?: string;
  showFooter?: boolean;
  dedication?: string;
  familyQuote?: string;
  thankYou?: string;
  templateLabel?: string;
  templateId?: string;
  coverStyle?: string;
  openerStyle?: string;
  photoLayout?: string;
  timelineStyle?: string;
  quoteStyle?: string;
  dividerStyle?: string;
  deep?: string;
  coverInk?: string;
  dropCap?: string;
  uppercaseLabels?: boolean;
  bodySize?: string;
  bodyLeading?: string;
  showHeader?: boolean;
  coverPhotoId?: string;
};

function hexToRgb(hex: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!hex) return fallback;
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return fallback;
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}

function cssFontSizeToPt(value: string | undefined, fallbackPt: number): number {
  if (!value) return fallbackPt;
  const raw = value.trim().toLowerCase();
  const amount = Number.parseFloat(raw);
  if (!Number.isFinite(amount) || amount <= 0) return fallbackPt;

  if (raw.endsWith("rem") || raw.endsWith("em")) return amount * 12;
  if (raw.endsWith("px")) return amount * 0.75;
  if (raw.endsWith("pt")) return amount;

  // Existing exports may pass plain point values; very small values are likely
  // unitless rem-style customisations, so keep body copy at a printable size.
  return amount < 5 ? amount * 12 : amount;
}

function cssLineHeightToPt(value: string | undefined, fontSizePt: number): number {
  if (!value) return fontSizePt * 1.55;
  const raw = value.trim().toLowerCase();
  const amount = Number.parseFloat(raw);
  if (!Number.isFinite(amount) || amount <= 0) return fontSizePt * 1.55;

  if (raw.endsWith("rem") || raw.endsWith("em")) return amount * 12;
  if (raw.endsWith("px")) return amount * 0.75;
  if (raw.endsWith("pt")) return amount;
  return fontSizePt * amount;
}

const isSansFamily = (f?: string) =>
  !!f && /sans-serif\s*$/i.test(f) && !/serif\s*$/i.test(f.replace(/sans-serif/gi, ""));

export async function buildPdf(
  data: Awaited<ReturnType<typeof loadBookData>>,
  print: boolean,
  design: ExportDesign = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  const bodySans = isSansFamily(design.bodyFont);
  const displaySans = isSansFamily(design.displayFont);
  const serif = await doc.embedFont(bodySans ? StandardFonts.Helvetica : StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(
    displaySans ? StandardFonts.HelveticaBold : StandardFonts.TimesRomanBold,
  );
  const serifItalic = await doc.embedFont(
    bodySans ? StandardFonts.HelveticaOblique : StandardFonts.TimesRomanItalic,
  );

  // Page size from the preview (mm → pt); print-ready adds 0.125" bleed
  const mm = (v: number) => (v * 72) / 25.4;
  const trimW = mm(design.pageWidthMm ?? 152);
  const trimH = mm(design.pageHeightMm ?? 229);
  const bleed = print ? 9 : 0;
  const pageW = trimW + bleed * 2;
  const pageH = trimH + bleed * 2;

  const themeId = (design.templateId ?? data.manuscript?.theme ?? "classic") as string;
  const fallback = THEME_PALETTES[themeId] ?? THEME_PALETTES.classic;
  const palette: ThemePalette = {
    bg: hexToRgb(design.paper, fallback.bg),
    ink: hexToRgb(design.ink, fallback.ink),
    accent: hexToRgb(design.accent, fallback.accent),
    muted: hexToRgb(design.muted, fallback.muted),
  };

  const marginPt = mm(design.marginMm ?? 20);
  const marginX = marginPt + bleed;
  const marginTop = marginPt + bleed;
  const marginBottom = marginPt + bleed;
  const contentW = pageW - marginX * 2;

  const cssColor = (
    value: string | undefined,
    fallbackColor: [number, number, number],
    fallbackAlpha = 1,
  ): { value: [number, number, number]; alpha: number } => {
    if (!value) return { value: fallbackColor, alpha: fallbackAlpha };
    const match = value.trim().match(/^rgba?\(([^)]+)\)$/i);
    if (match) {
      const parts = match[1].split(",").map((part) => Number(part.trim()));
      if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
        return {
          value: [parts[0] / 255, parts[1] / 255, parts[2] / 255],
          alpha: Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3])) : fallbackAlpha,
        };
      }
    }
    return { value: hexToRgb(value, fallbackColor), alpha: fallbackAlpha };
  };

  const ruleTone = cssColor(design.rule, fallback.accent, 0.5);
  const softTone = cssColor(design.accentSoft, fallback.accent, 0.1);
  const ruleColor = rgb(ruleTone.value[0], ruleTone.value[1], ruleTone.value[2]);
  const softColor = rgb(softTone.value[0], softTone.value[1], softTone.value[2]);

  const drawPageBg = (page: any) => {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
      color: rgb(palette.bg[0], palette.bg[1], palette.bg[2]),
    });
    const background = `${design.background ?? ""} ${themeId}`.toLowerCase();
    if (background.includes("oldpaper") || background.includes("vintage") || background.includes("repeating-linear")) {
      for (let y = bleed + 8; y < pageH - bleed; y += 10) {
        page.drawLine({
          start: { x: bleed, y },
          end: { x: pageW - bleed, y },
          thickness: 0.2,
          color: ruleColor,
          opacity: 0.12,
        });
      }
    }
    if (background.includes("radial") || background.includes("water") || background.includes("floral") || background.includes("scrapbook")) {
      page.drawCircle({ x: pageW * 0.18, y: pageH * 0.84, size: pageW * 0.18, color: softColor, opacity: Math.min(0.45, softTone.alpha + 0.2) });
      page.drawCircle({ x: pageW * 0.83, y: pageH * 0.18, size: pageW * 0.2, color: softColor, opacity: Math.min(0.36, softTone.alpha + 0.16) });
    }
    if (print) {
      // Crop marks
      const c = rgb(0, 0, 0);
      const l = 12;
      // top-left
      page.drawLine({ start: { x: bleed, y: pageH - bleed + 2 }, end: { x: bleed, y: pageH - bleed + l + 2 }, thickness: 0.5, color: c });
      page.drawLine({ start: { x: bleed - 2, y: pageH - bleed }, end: { x: bleed - l - 2, y: pageH - bleed }, thickness: 0.5, color: c });
      // top-right
      page.drawLine({ start: { x: pageW - bleed, y: pageH - bleed + 2 }, end: { x: pageW - bleed, y: pageH - bleed + l + 2 }, thickness: 0.5, color: c });
      page.drawLine({ start: { x: pageW - bleed + 2, y: pageH - bleed }, end: { x: pageW - bleed + l + 2, y: pageH - bleed }, thickness: 0.5, color: c });
      // bottom-left
      page.drawLine({ start: { x: bleed, y: bleed - 2 }, end: { x: bleed, y: bleed - l - 2 }, thickness: 0.5, color: c });
      page.drawLine({ start: { x: bleed - 2, y: bleed }, end: { x: bleed - l - 2, y: bleed }, thickness: 0.5, color: c });
      // bottom-right
      page.drawLine({ start: { x: pageW - bleed, y: bleed - 2 }, end: { x: pageW - bleed, y: bleed - l - 2 }, thickness: 0.5, color: c });
      page.drawLine({ start: { x: pageW - bleed + 2, y: bleed }, end: { x: pageW - bleed + l + 2, y: bleed }, thickness: 0.5, color: c });
    }
  };

  let page = doc.addPage([pageW, pageH]);
  let cursorY = pageH - marginTop;
  let pageNum = 1;
  drawPageBg(page);

  const inkColor = rgb(palette.ink[0], palette.ink[1], palette.ink[2]);
  const accentColor = rgb(palette.accent[0], palette.accent[1], palette.accent[2]);
  const mutedColor = rgb(palette.muted[0], palette.muted[1], palette.muted[2]);
  const deepRgb = hexToRgb(design.deep, palette.ink);
  const deepColor = rgb(deepRgb[0], deepRgb[1], deepRgb[2]);
  const coverInkRgb = hexToRgb(design.coverInk, [1, 1, 1]);
  const coverInkColor = rgb(coverInkRgb[0], coverInkRgb[1], coverInkRgb[2]);
  const showFooter = design.showFooter !== false;
  const showHeader = design.showHeader !== false;
  const labelText = (text: string) => design.uppercaseLabels === false ? text : text.toUpperCase();
  const bodySize = cssFontSizeToPt(design.bodySize, 11.5);
  const bodyLeading = Math.max(bodySize * 1.45, cssLineHeightToPt(design.bodyLeading, bodySize));


  const newPage = () => {
    // Footer page number
    if (showFooter) {
      const label = String(pageNum);
      const w = serif.widthOfTextAtSize(label, 9);
      page.drawText(label, {
        x: (pageW - w) / 2,
        y: bleed + 36,
        size: 9,
        font: serif,
        color: mutedColor,
      });
    }
    page = doc.addPage([pageW, pageH]);
    drawPageBg(page);
    cursorY = pageH - marginTop;
    pageNum += 1;
  };

  const drawHeader = (text: string) => {
    if (!showHeader || !text) return;
    const safe = sanitizeWinAnsi(text).slice(0, 70);
    page.drawText(safe, {
      x: marginX,
      y: pageH - bleed - 25,
      size: 7.5,
      font: serif,
      color: mutedColor,
    });
  };

  const drawRule = (width = contentW * 0.35, centered = false) => {
    const y = cursorY - 4;
    const x = centered ? (pageW - width) / 2 : marginX;
    page.drawLine({
      start: { x, y },
      end: { x: x + width, y },
      thickness: 1,
      color: ruleColor,
      opacity: ruleTone.alpha,
    });
    cursorY -= 14;
  };

  const drawKicker = (text: string, centered = false, color = accentColor) => {
    const safe = labelText(sanitizeWinAnsi(text));
    const size = 8;
    const w = serifBold.widthOfTextAtSize(safe, size);
    ensureSpace(16);
    page.drawText(safe, {
      x: centered ? (pageW - w) / 2 : marginX,
      y: cursorY - size,
      size,
      font: serifBold,
      color,
    });
    cursorY -= 18;
  };

  const drawDivider = (centered = false) => {
    if (design.dividerStyle === "dots") {
      const startX = centered ? pageW / 2 - 12 : marginX;
      for (let i = 0; i < 3; i += 1) page.drawCircle({ x: startX + i * 12, y: cursorY - 4, size: 1.7, color: accentColor });
      cursorY -= 16;
      return;
    }
    if (design.dividerStyle === "block") {
      page.drawRectangle({ x: centered ? pageW / 2 - 20 : marginX, y: cursorY - 6, width: 40, height: 5, color: accentColor });
      cursorY -= 18;
      return;
    }
    drawRule(centered ? 60 : contentW * 0.35, centered);
  };

  // ---- Photos ----
  const embedCache = new Map<BookPhoto, any>();
  const embedPhoto = async (ph: BookPhoto) => {
    if (embedCache.has(ph)) return embedCache.get(ph);
    let img: any = null;
    try {
      const b = ph.bytes;
      if (b[0] === 0xff && b[1] === 0xd8) img = await doc.embedJpg(b);
      else if (b[0] === 0x89 && b[1] === 0x50) img = await doc.embedPng(b);
    } catch {
      img = null;
    }
    embedCache.set(ph, img);
    return img;
  };

  const photosOf = (category: string) =>
    (data.photos ?? []).filter((p) => p.category === category);


  const ensureSpace = (needed: number) => {
    if (cursorY - needed < marginBottom) newPage();
  };

  const drawParagraph = (
    text: string,
    opts: { font?: any; size?: number; color?: any; align?: "left" | "center"; leading?: number; spaceAfter?: number; width?: number; x?: number } = {},
  ) => {
    const font = opts.font ?? serif;
    const size = opts.size ?? bodySize;
    const color = opts.color ?? inkColor;
    const leading = opts.leading ?? bodyLeading;
    const width = opts.width ?? contentW;
    const xBase = opts.x ?? marginX;
    const paragraphs = text.split(/\n\n+/);
    for (const p of paragraphs) {
      const lines = wrapText(p.trim(), font, size, width);
      for (const line of lines) {
        ensureSpace(leading);
        const w = font.widthOfTextAtSize(line, size);
        const x = opts.align === "center" ? (pageW - w) / 2 : xBase;
        page.drawText(line, { x, y: cursorY - size, size, font, color });
        cursorY -= leading;
      }
      cursorY -= (opts.spaceAfter ?? 6);
    }
  };

  const drawCoverImage = async (ph: BookPhoto, x: number, y: number, width: number, height: number) => {
    const img = await embedPhoto(ph);
    if (!img) return false;
    const isFullPage = Math.abs(width - pageW) < 1 && Math.abs(height - pageH) < 1;
    const scale = isFullPage ? Math.max(width / img.width, height / img.height) : Math.min(width / img.width, height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    page.drawImage(img, { x: x + (width - drawW) / 2, y: y + (height - drawH) / 2, width: drawW, height: drawH });
    return true;
  };

  const drawFigure = async (
    ph: BookPhoto,
    x: number,
    topY: number,
    width: number,
    height: number,
    frame = design.photoLayout ?? "rounded",
  ) => {
    const img = await embedPhoto(ph);
    if (!img) return 0;
    const polaroid = frame === "polaroid" || frame === "collage";
    const vintage = frame === "vintage";
    const pad = polaroid ? 7 : vintage ? 4 : 0;
    const captionHeight = ph.caption?.trim() ? (polaroid ? 22 : 15) : polaroid ? 12 : 0;
    const totalHeight = height + pad * 2 + captionHeight;
    const y = topY - totalHeight;
    if (polaroid) page.drawRectangle({ x, y, width, height: totalHeight, color: rgb(1, 1, 1) });
    if (frame === "rounded") page.drawRectangle({ x, y: y + captionHeight, width, height: height + pad * 2, color: softColor, opacity: softTone.alpha });
    const scale = Math.min((width - pad * 2) / img.width, height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    page.drawImage(img, {
      x: x + pad + (width - pad * 2 - drawW) / 2,
      y: y + captionHeight + pad + (height - drawH) / 2,
      width: drawW,
      height: drawH,
    });
    if (frame !== "borderless" && frame !== "full") {
      page.drawRectangle({ x, y, width, height: totalHeight, borderColor: ruleColor, borderWidth: 0.65, opacity: 0.8 });
    }
    if (ph.caption?.trim()) {
      const caption = sanitizeWinAnsi(ph.caption.trim()).slice(0, 90);
      const size = polaroid ? 10 : 7.5;
      const font = polaroid ? serifItalic : serif;
      const textW = font.widthOfTextAtSize(caption, size);
      page.drawText(caption, { x: x + Math.max(pad, (width - textW) / 2), y: y + 6, size, font, color: mutedColor });
    }
    return totalHeight;
  };

  const drawPhoto = async (ph: BookPhoto, maxH: number, width = contentW, align: "left" | "center" | "right" = "center") => {
    const img = await embedPhoto(ph);
    if (!img) return;
    const scale = Math.min(width / img.width, maxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = align === "left" ? marginX : align === "right" ? pageW - marginX - w : (pageW - w) / 2;
    ensureSpace(h + 38);
    const used = await drawFigure(ph, x, cursorY, w, h, design.photoLayout ?? "rounded");
    cursorY -= used + 12;
  };

  const drawPhotoBlock = async (photos: BookPhoto[]) => {
    const list = photos.slice(0, 5);
    if (!list.length) return;
    const layout = design.photoLayout ?? "rounded";
    if (layout === "full" || layout === "borderless" || list.length === 1) {
      const h = Math.min(contentW * 0.66, pageH * 0.4);
      ensureSpace(h + 34);
      const used = await drawFigure(list[0], marginX, cursorY, contentW, h, layout);
      cursorY -= used + 14;
      return;
    }
    if (layout === "magazine") {
      const gap = 9;
      const leftW = contentW * 0.58;
      const rightW = contentW - leftW - gap;
      const h = Math.min(leftW * 1.08, pageH * 0.34);
      ensureSpace(h + 36);
      await drawFigure(list[0], marginX, cursorY, leftW, h, "magazine");
      if (list[1]) await drawFigure(list[1], marginX + leftW + gap, cursorY, rightW, (h - gap) / 2, "magazine");
      if (list[2]) await drawFigure(list[2], marginX + leftW + gap, cursorY - (h + gap) / 2, rightW, (h - gap) / 2, "magazine");
      cursorY -= h + 22;
      return;
    }
    const columns = layout === "collage" && list.length >= 3 ? 3 : 2;
    const gap = layout === "polaroid" ? 14 : 8;
    const cellW = (contentW - gap * (columns - 1)) / columns;
    const cellH = layout === "polaroid" ? cellW : cellW * 0.82;
    const rows = Math.ceil(Math.min(list.length, columns === 3 ? 5 : 4) / columns);
    ensureSpace(rows * (cellH + gap + 12) + 18);
    for (const [i, ph] of list.slice(0, columns === 3 ? 5 : 4).entries()) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = marginX + col * (cellW + gap);
      const top = cursorY - row * (cellH + gap + 12);
      await drawFigure(ph, x, top, cellW, cellH, layout);
    }
    cursorY -= rows * (cellH + gap + 12) + 12;
  };

  const drawQuote = (quote: string, attribution?: string, centered = false) => {
    const style = design.quoteStyle ?? "center";
    ensureSpace(70);
    if (style === "box") page.drawRectangle({ x: marginX - 8, y: cursorY - 54, width: contentW + 16, height: 60, color: softColor, opacity: Math.max(softTone.alpha, 0.08), borderColor: ruleColor, borderWidth: 0.5 });
    if (style === "side") page.drawLine({ start: { x: marginX, y: cursorY }, end: { x: marginX, y: cursorY - 52 }, thickness: 2, color: accentColor });
    if (style === "pull") drawRule(contentW, false);
    drawParagraph(`“${quote.trim()}”`, {
      font: serifItalic,
      size: style === "center" || centered ? 15 : 12,
      color: deepColor,
      align: style === "center" || centered ? "center" : "left",
      x: style === "side" ? marginX + 16 : marginX,
      width: style === "side" ? contentW - 16 : contentW,
      leading: style === "center" || centered ? 21 : 17,
      spaceAfter: 2,
    });
    if (attribution) drawParagraph(attribution, { size: 8, color: mutedColor, align: style === "center" || centered ? "center" : "left", leading: 11, spaceAfter: 6 });
    if (style === "pull") drawRule(contentW, false);
  };

  const drawNarrative = (text: string, useDropCap = true) => {
    const parts = text.split(/\n\n+/).filter((p) => p.trim());
    for (const [index, para] of parts.entries()) {
      const trimmed = para.trim();
      if (index === 0 && useDropCap && design.dropCap !== "none" && trimmed.length > 1) {
        ensureSpace(58);
        const first = sanitizeWinAnsi(trimmed.charAt(0));
        const rest = trimmed.slice(1);
        const boxed = design.dropCap === "boxed";
        const dropSize = boxed ? 25 : design.dropCap === "script" ? 43 : 39;
        const dropW = boxed ? 36 : serifBold.widthOfTextAtSize(first, dropSize) + 8;
        if (boxed) page.drawRectangle({ x: marginX, y: cursorY - 32, width: 30, height: 30, color: accentColor });
        page.drawText(first, { x: boxed ? marginX + 8 : marginX, y: boxed ? cursorY - 27 : cursorY - dropSize * 0.78, size: dropSize, font: serifBold, color: boxed ? coverInkColor : accentColor });
        drawParagraph(rest, { x: marginX + dropW, width: contentW - dropW, spaceAfter: 8 });
      } else {
        drawParagraph(trimmed, { spaceAfter: 8 });
      }
    }
  };

  const drawTimeline = (items: Array<{ year?: string; event?: string }>) => {
    const rows = items.filter((i) => i?.year || i?.event);
    if (!rows.length) return;
    drawKicker("Timeline");
    if (design.timelineStyle === "cards") {
      const gap = 8;
      const cardW = (contentW - gap) / 2;
      for (const [i, row] of rows.entries()) {
        if (i % 2 === 0) ensureSpace(64);
        const x = marginX + (i % 2) * (cardW + gap);
        const y = cursorY - 52;
        page.drawRectangle({ x, y, width: cardW, height: 48, color: softColor, opacity: Math.max(softTone.alpha, 0.08), borderColor: ruleColor, borderWidth: 0.5 });
        page.drawText(sanitizeWinAnsi(String(row.year ?? "")), { x: x + 8, y: y + 31, size: 10, font: serifBold, color: accentColor });
        wrapText(String(row.event ?? ""), serif, 8.3, cardW - 16).slice(0, 2).forEach((line, lineIndex) => page.drawText(line, { x: x + 8, y: y + 18 - lineIndex * 10, size: 8.3, font: serif, color: inkColor }));
        if (i % 2 === 1 || i === rows.length - 1) cursorY -= 60;
      }
      return;
    }
    if (design.timelineStyle === "journey") {
      const railX = pageW / 2;
      const top = cursorY;
      for (const [i, row] of rows.entries()) {
        ensureSpace(38);
        const right = i % 2 === 1;
        page.drawCircle({ x: railX, y: cursorY - 8, size: 3.3, color: accentColor });
        drawParagraph(`${row.year ?? ""} — ${row.event ?? ""}`, { x: right ? railX + 16 : marginX, width: contentW / 2 - 22, size: 9.2, color: mutedColor, leading: 12, spaceAfter: 2 });
      }
      page.drawLine({ start: { x: railX, y: top }, end: { x: railX, y: cursorY + 10 }, thickness: 0.6, color: ruleColor, opacity: ruleTone.alpha });
      return;
    }
    for (const row of rows) {
      ensureSpace(28);
      page.drawCircle({ x: marginX + 4, y: cursorY - 8, size: 3, color: accentColor });
      drawParagraph(`${row.year ?? ""} — ${row.event ?? ""}`, { x: marginX + 18, width: contentW - 18, size: 10, color: mutedColor, leading: 14, spaceAfter: 2 });
    }
  };

  // ---- Cover ----
  const coverPhoto =
    ((design.coverPhotoId && design.coverPhotoId !== "auto")
      ? (data.photos ?? []).find((photo) => photo.id === design.coverPhotoId)
      : undefined) ?? (data.photos ?? [])[0];
  const coverStyle = design.coverStyle ?? "plate";
  const coverTitle = data.book.name || "A Family History";
  const subtitle = [data.book.date_of_birth, data.book.country].filter(Boolean).join(" · ");

  if (coverStyle === "fullbleed" && coverPhoto) {
    await drawCoverImage(coverPhoto, 0, 0, pageW, pageH);
    page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: deepColor, opacity: 0.26 });
    page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH * 0.42, color: deepColor, opacity: 0.78 });
    cursorY = pageH * 0.34;
    drawKicker("A Family History", true, coverInkColor);
    drawParagraph(coverTitle, { font: serifBold, size: 34, color: coverInkColor, align: "center", leading: 39, spaceAfter: 10 });
  } else if (coverStyle === "band") {
    page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: deepColor });
    page.drawLine({ start: { x: bleed + trimW * 0.07, y: bleed }, end: { x: bleed + trimW * 0.07, y: pageH - bleed }, thickness: 1, color: coverInkColor, opacity: 0.22 });
    page.drawLine({ start: { x: bleed + trimW * 0.1, y: bleed }, end: { x: bleed + trimW * 0.1, y: pageH - bleed }, thickness: 1, color: coverInkColor, opacity: 0.22 });
    page.drawRectangle({ x: marginX * 0.65, y: marginBottom * 0.65, width: pageW - marginX * 1.3, height: pageH - marginTop * 0.65 - marginBottom * 0.65, borderColor: coverInkColor, borderWidth: 1, opacity: 0.45 });
    cursorY = pageH * 0.62;
    drawKicker("Memoirs", true, coverInkColor);
    drawParagraph(coverTitle, { font: serifBold, size: 34, color: coverInkColor, align: "center", leading: 42, spaceAfter: 16 });
    drawDivider(true);
  } else if (coverStyle === "typeonly") {
    cursorY = pageH * 0.7;
    drawDivider(true);
    drawParagraph(coverTitle, { font: serifBold, size: 38, color: inkColor, align: "center", leading: 46, spaceAfter: 24 });
    drawDivider(true);
    drawKicker("A Family History", true, mutedColor);
  } else if (coverStyle === "masthead") {
    page.drawRectangle({ x: bleed, y: pageH - bleed - 52, width: trimW, height: 52, borderColor: ruleColor, borderWidth: 0.8, opacity: ruleTone.alpha });
    cursorY = pageH - bleed - 24;
    drawKicker("A Life in Stories", true, inkColor);
    if (coverPhoto) await drawCoverImage(coverPhoto, bleed, pageH * 0.28, trimW, pageH * 0.54);
    page.drawRectangle({ x: bleed, y: pageH * 0.1, width: trimW, height: pageH * 0.2, color: accentColor });
    cursorY = pageH * 0.25;
    drawParagraph(coverTitle, { font: serifBold, size: 30, color: coverInkColor, align: "center", leading: 35, spaceAfter: 5 });
  } else {
    page.drawRectangle({ x: marginX * 0.7, y: marginBottom * 0.7, width: pageW - marginX * 1.4, height: pageH - marginTop * 0.7 - marginBottom * 0.7, borderColor: ruleColor, borderWidth: coverStyle === "crest" || coverStyle === "framed" ? 2 : 1, opacity: 0.88 });
    cursorY = pageH * 0.84;
    if (coverStyle === "crest") {
      page.drawCircle({ x: pageW / 2, y: cursorY - 22, size: 20, borderColor: accentColor, borderWidth: 1.5 });
      const initial = sanitizeWinAnsi(coverTitle.charAt(0).toUpperCase());
      page.drawText(initial, { x: pageW / 2 - serifBold.widthOfTextAtSize(initial, 20) / 2, y: cursorY - 29, size: 20, font: serifBold, color: accentColor });
      cursorY -= 58;
    }
    drawKicker(coverStyle === "framed" || coverStyle === "crest" ? "The Life & Times Of" : "A Family History", true);
    drawParagraph(coverTitle, { font: serifBold, size: 32, color: inkColor, align: "center", leading: 38, spaceAfter: 12 });
    if (coverPhoto && coverStyle !== "illustrated") {
      const photoW = contentW * (coverStyle === "polaroid" || coverStyle === "collage" ? 0.66 : 0.58);
      await drawPhoto({ ...coverPhoto, caption: data.book.nickname ? `“${data.book.nickname}”` : null }, pageH * 0.25, photoW);
    }
    if (coverStyle === "illustrated") drawDivider(true);
  }
  if (subtitle) {
    drawParagraph(subtitle, { size: 10, color: coverStyle === "band" || coverStyle === "fullbleed" ? coverInkColor : mutedColor, align: "center" });
  }
  newPage();

  // ---- Half title ----
  cursorY = pageH * 0.58;
  drawParagraph(coverTitle, { font: serifBold, size: 28, color: inkColor, align: "center", leading: 34, spaceAfter: 8 });
  const relationLine = [data.book.relationship, data.book.country].filter(Boolean).join(" · ");
  if (relationLine) drawParagraph(relationLine, { size: 10, color: mutedColor, align: "center" });
  newPage();

  // ---- Dedication / family quote ----
  cursorY = pageH * 0.6;
  drawKicker("Dedication", true);
  drawParagraph(
    design.dedication?.trim() || `For ${data.book.nickname || coverTitle}, and for everyone who will read these pages long after us.`,
    { font: serifItalic, size: 14, color: inkColor, align: "center", leading: 21, spaceAfter: 22 },
  );
  drawDivider(true);
  newPage();

  cursorY = pageH * 0.58;
  const allQuotes = data.chapters.flatMap((chapter) => (Array.isArray(chapter.quotes) ? chapter.quotes : [])).filter((quote) => quote?.trim());
  drawQuote(
    design.familyQuote?.trim() || allQuotes[0] || "A family is a story that never truly ends — it is only handed to the next pair of hands.",
    coverTitle,
    true,
  );
  newPage();

  // ---- Table of contents ----
  drawKicker("Contents");
  drawParagraph("Table of Contents", { font: serifBold, size: 22, color: inkColor, leading: 28, spaceAfter: 12 });
  const tocRows = [
    ...(data.manuscript?.introduction ? [{ left: "Introduction", right: "i" }] : []),
    ...data.chapters.map((chapter, index) => ({ left: `${String(index + 1).padStart(2, "0")}  ${chapter.title || chapter.topic}`, right: String(index + 1) })),
    { left: "Important Dates", right: "—" },
    { left: "A Letter to the Family", right: "—" },
  ];
  for (const row of tocRows) {
    ensureSpace(24);
    page.drawLine({ start: { x: marginX, y: cursorY - 16 }, end: { x: pageW - marginX, y: cursorY - 16 }, thickness: 0.35, color: ruleColor, opacity: ruleTone.alpha });
    page.drawText(sanitizeWinAnsi(row.left), { x: marginX, y: cursorY - 10, size: 10.5, font: serif, color: inkColor });
    const safeRight = sanitizeWinAnsi(row.right);
    const rightWidth = serif.widthOfTextAtSize(safeRight, 10);
    page.drawText(safeRight, { x: pageW - marginX - rightWidth, y: cursorY - 10, size: 10, font: serif, color: mutedColor });
    cursorY -= 24;
  }
  newPage();

  // ---- Introduction ----
  if (data.manuscript?.introduction) {
    drawKicker("Introduction");
    drawParagraph("Before we begin", { font: serifBold, size: 22, color: inkColor, leading: 28, spaceAfter: 4 });
    drawRule();
    drawNarrative(data.manuscript.introduction, true);
    newPage();
  }


  // ---- Chapters ----
  for (const [chapterIndex, ch] of data.chapters.entries()) {
    const chapterTitle = ch.title || ch.topic;
    const chapterPhotos = photosOf(TOPIC_TO_CATEGORY[String(ch.topic).toLowerCase()] ?? String(ch.topic).toLowerCase()).slice(0, 5);
    const opener = design.openerStyle ?? "numeral";

    if (opener === "photo" && chapterPhotos[0]) {
      await drawCoverImage(chapterPhotos[0], 0, 0, pageW, pageH);
      page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH * 0.34, color: deepColor, opacity: 0.72 });
      cursorY = pageH * 0.28;
      drawKicker(`Chapter ${chapterIndex + 1}`, false, coverInkColor);
      drawParagraph(chapterTitle, { font: serifBold, size: 30, color: coverInkColor, leading: 36, spaceAfter: 4 });
    } else if (opener === "split" && chapterPhotos[0]) {
      await drawCoverImage(chapterPhotos[0], bleed, bleed, trimW / 2, trimH);
      cursorY = pageH * 0.56;
      drawParagraph(`Chapter ${chapterIndex + 1}`, { x: marginX + contentW * 0.52, width: contentW * 0.45, font: serifItalic, size: 10, color: mutedColor, leading: 14, spaceAfter: 4 });
      drawParagraph(chapterTitle, { x: marginX + contentW * 0.52, width: contentW * 0.45, font: serifBold, size: 24, color: inkColor, leading: 30, spaceAfter: 4 });
    } else if (opener === "band") {
      cursorY = pageH * 0.58;
      page.drawRectangle({ x: marginX, y: cursorY - 8, width: contentW, height: 10, color: accentColor });
      cursorY -= 28;
      drawKicker(`Chapter ${chapterIndex + 1}`);
      drawParagraph(chapterTitle, { font: serifBold, size: 28, color: inkColor, leading: 34, spaceAfter: 8 });
    } else if (opener === "folio") {
      cursorY = pageH * 0.72;
      const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][chapterIndex] ?? String(chapterIndex + 1);
      drawParagraph(roman, { font: serifBold, size: 28, color: mutedColor, align: "center", leading: 34, spaceAfter: 12 });
      drawParagraph(chapterTitle, { font: serifBold, size: 28, color: inkColor, align: "center", leading: 34, spaceAfter: 8 });
      drawRule(70, true);
    } else if (opener === "ornament") {
      cursorY = pageH * 0.62;
      drawDivider(true);
      drawKicker(`Chapter ${chapterIndex + 1}`, true);
      drawParagraph(chapterTitle, { font: serifBold, size: 27, color: inkColor, align: "center", leading: 33, spaceAfter: 8 });
      drawDivider(true);
    } else {
      cursorY = pageH * 0.7;
      const numeral = String(chapterIndex + 1).padStart(2, "0");
      page.drawText(numeral, { x: marginX, y: cursorY - 56, size: 62, font: serifBold, color: accentColor, opacity: 0.18 });
      cursorY -= 72;
      drawKicker(`Chapter ${chapterIndex + 1}`);
      drawParagraph(chapterTitle, { font: serifBold, size: 28, color: inkColor, leading: 34, spaceAfter: 8 });
      drawRule(70, false);
    }
    newPage();

    drawHeader(chapterTitle);

    if (ch.narrative) {
      drawNarrative(ch.narrative, true);
    }

    const quotes = (Array.isArray(ch.quotes) ? ch.quotes : []).filter((quote) => quote?.trim());
    if (quotes[0]) drawQuote(quotes[0], coverTitle);

    if (chapterPhotos.length > 0) await drawPhotoBlock(chapterPhotos);

    if (Array.isArray(ch.timeline) && ch.timeline.length > 0) {
      drawTimeline(ch.timeline);
    }

    if (quotes[1]) drawQuote(quotes[1], `Closing — ${chapterTitle}`, true);
    drawDivider(false);

    newPage();
  }

  const allTimeline = data.chapters.flatMap((chapter) => (Array.isArray(chapter.timeline) ? chapter.timeline : []));
  if (allTimeline.length > 0) {
    drawKicker("Special Page");
    drawParagraph("Important Dates", { font: serifBold, size: 22, color: inkColor, leading: 28, spaceAfter: 8 });
    drawTimeline(allTimeline);
    newPage();
  }

  // Preview includes special pages; include matching print pages in PDF too.
  drawKicker("Special Page");
  drawParagraph("Family Tree", { font: serifBold, size: 22, color: inkColor, leading: 28, spaceAfter: 18 });
  ensureSpace(170);
  const nodeW = contentW * 0.45;
  const nodeX = (pageW - nodeW) / 2;
  page.drawRectangle({ x: nodeX, y: cursorY - 42, width: nodeW, height: 38, borderColor: ruleColor, borderWidth: 0.8 });
  page.drawText(sanitizeWinAnsi(coverTitle), { x: nodeX + 12, y: cursorY - 22, size: 12, font: serifBold, color: inkColor });
  page.drawLine({ start: { x: pageW / 2, y: cursorY - 42 }, end: { x: pageW / 2, y: cursorY - 74 }, thickness: 0.7, color: ruleColor, opacity: ruleTone.alpha });
  const childW = (contentW - 18) / 3;
  ["Parents", "Siblings", "Children"].forEach((node, index) => {
    const x = marginX + index * (childW + 9);
    page.drawRectangle({ x, y: cursorY - 122, width: childW, height: 38, borderColor: ruleColor, borderWidth: 0.7, color: softColor, opacity: Math.max(softTone.alpha, 0.08) });
    page.drawText(node, { x: x + 10, y: cursorY - 101, size: 10, font: serifBold, color: inkColor });
  });
  cursorY -= 150;
  newPage();

  if (allQuotes.length > 0) {
    drawKicker("Special Page");
    drawParagraph("Life Lessons & Favourite Quotes", { font: serifBold, size: 20, color: inkColor, leading: 26, spaceAfter: 10 });
    for (const quote of allQuotes.slice(0, 4)) drawQuote(quote, coverTitle, false);
    newPage();
  }

  if ((data.photos ?? []).length > 2) {
    drawKicker("Gallery");
    drawParagraph("Photo Memories", { font: serifBold, size: 22, color: inkColor, leading: 28, spaceAfter: 10 });
    await drawPhotoBlock((data.photos ?? []).slice(0, 5));
    newPage();
  }

  // ---- Ending ----
  if (data.manuscript?.ending) {
    drawKicker("Ending Letter");
    drawParagraph("A Letter to the Family", { font: serifBold, size: 22, color: inkColor, leading: 28, spaceAfter: 4 });
    drawRule();
    drawNarrative(data.manuscript.ending, true);
  }

  // ---- Thank you ----
  newPage();
  cursorY = pageH * 0.6;
  drawKicker("Thank You", true);
  drawParagraph(
    design.thankYou?.trim() || "Thank you to everyone who remembered, corrected, laughed and cried while these pages were made.",
    {
      font: serifItalic,
      size: 14,
      color: accentColor,
      align: design.quoteStyle === "side" ? "left" : "center",
      leading: 21,
    },
  );

  // Final footer
  if (showFooter) {
    const label = String(pageNum);
    const w = serif.widthOfTextAtSize(label, 9);
    page.drawText(label, {
      x: (pageW - w) / 2,
      y: bleed + 36,
      size: 9,
      font: serif,
      color: mutedColor,
    });
  }


  const bytes = await doc.save();
  assertValidPdfBytes(bytes);
  return bytes;
}

export function assertValidPdfBytes(bytes: Uint8Array): void {
  if (bytes.byteLength < 1024) {
    throw new Error("PDF generation failed: the generated file is empty.");
  }

  const header = String.fromCharCode(...bytes.slice(0, 5));
  if (header !== "%PDF-") {
    throw new Error("PDF generation failed: invalid PDF header.");
  }

  const tailStart = Math.max(0, bytes.byteLength - 2048);
  const tail = new TextDecoder().decode(bytes.slice(tailStart));
  if (!tail.includes("%%EOF")) {
    throw new Error("PDF generation failed: incomplete PDF file.");
  }
}

// --------- DOCX ---------

export async function buildDocx(
  data: Awaited<ReturnType<typeof loadBookData>>,
  design: ExportDesign = {},
): Promise<Uint8Array> {
  const accentHex = (design.accent ?? "#8B5E3C").replace("#", "");
  const inkHex = (design.ink ?? "#2B2118").replace("#", "");
  const mutedHex = (design.muted ?? "#7A6A58").replace("#", "");
  const familyOf = (css?: string) =>
    (css ?? "").split(",")[0].replace(/['"]/g, "").trim() || "Georgia";
  const displayFamily = familyOf(design.displayFont);
  const bodyFamily = familyOf(design.bodyFont);
  const children: Paragraph[] = [];

  // Cover
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 4000, after: 400 },
      children: [
        new TextRun({ text: data.book.name || "A Family History", bold: true, size: 64, font: displayFamily, color: accentHex }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "A Family History", italics: true, size: 28, font: displayFamily, color: mutedHex })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: [data.book.date_of_birth, data.book.country].filter(Boolean).join(" · "),
          size: 22,
          font: bodyFamily,
          color: mutedHex,
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  if (data.manuscript?.introduction) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
        children: [new TextRun({ text: "Introduction", bold: true, size: 40, font: displayFamily, color: accentHex })],
      }),
    );
    for (const p of data.manuscript.introduction.split(/\n\n+/)) {
      children.push(
        new Paragraph({
          spacing: { after: 200, line: 340 },
          children: [new TextRun({ text: p.trim(), size: 24, font: bodyFamily, color: inkHex })],
        }),
      );
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  for (const ch of data.chapters) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: `Chapter ${ch.position}`, italics: true, size: 20, color: mutedHex, font: bodyFamily })],
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
        children: [new TextRun({ text: ch.title || ch.topic, bold: true, size: 40, font: displayFamily, color: accentHex })],
      }),
    );
    for (const p of (ch.narrative || "").split(/\n\n+/)) {
      if (!p.trim()) continue;
      children.push(
        new Paragraph({
          spacing: { after: 200, line: 340 },
          children: [new TextRun({ text: p.trim(), size: 24, font: bodyFamily, color: inkHex })],
        }),
      );
    }
    if (Array.isArray(ch.timeline) && ch.timeline.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 120 },
          children: [new TextRun({ text: "Timeline", bold: true, size: 28, font: displayFamily, color: accentHex })],
        }),
      );
      for (const t of ch.timeline) {
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: `${t.year} — ${t.event}`, size: 22, font: bodyFamily, color: mutedHex })],
          }),
        );
      }
    }
    if (Array.isArray(ch.quotes) && ch.quotes.length > 0) {
      for (const q of ch.quotes) {
        if (!q?.trim()) continue;
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [new TextRun({ text: `“${q.trim()}”`, italics: true, size: 26, font: bodyFamily, color: accentHex })],
          }),
        );
      }
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  if (data.manuscript?.ending) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
        children: [new TextRun({ text: "Ending Message", bold: true, size: 40, font: displayFamily, color: accentHex })],
      }),
    );
    for (const p of data.manuscript.ending.split(/\n\n+/)) {
      children.push(
        new Paragraph({
          spacing: { after: 200, line: 340 },
          children: [new TextRun({ text: p.trim(), size: 24, font: bodyFamily, color: inkHex })],
        }),
      );
    }
  }

  const doc = new DocxDocument({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}

export function slugify(s: string): string {
  return (s || "family-history")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "family-history";
}
