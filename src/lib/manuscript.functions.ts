import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { INTERVIEW_TOPICS } from "./interview.functions";

export const BOOK_THEMES = [
  { id: "classic", label: "Classic", description: "Timeless trade-hardcover serif, centred title plate." },
  { id: "vintage", label: "Vintage", description: "Aged paper, typewriter titles, hand-tinted frames." },
  { id: "modern", label: "Modern", description: "Swiss grid, hairlines, borderless photography." },
  { id: "leather_journal", label: "Leather Journal", description: "Debossed leather, handwriting, tipped-in polaroids." },
  { id: "family_album", label: "Family Album", description: "Photo-forward album pages with taped corners." },
  { id: "timeline_split", label: "Timeline Split", description: "Alternating photo/story spreads on a life line." },
  { id: "heritage", label: "Heritage", description: "Parchment, engraved capitals, crest cover." },
  { id: "luxury_minimal", label: "Luxury Minimal", description: "Ivory, hairlines, type-only cover, silent plates." },
  { id: "scrapbook", label: "Scrapbook Memories", description: "Layered paper, washi tape, pinned polaroids." },
  { id: "coffee_table", label: "Coffee Table Book", description: "Oversized full-bleed photography, Bodoni display." },
  { id: "magazine", label: "Magazine Style", description: "Masthead cover, kickers, boxed pull quotes." },
  { id: "storybook", label: "Storybook", description: "Watercolour washes and calligraphic titles." },
] as const;

export type BookThemeId = (typeof BOOK_THEMES)[number]["id"];

const themeEnum = z.enum([
  "classic",
  "vintage",
  "modern",
  "leather_journal",
  "family_album",
  "timeline_split",
  "heritage",
  "luxury_minimal",
  "scrapbook",
  "coffee_table",
  "magazine",
  "storybook",
]);

async function ensureBookAccess(supabase: any, bookId: string) {
  const { data, error } = await supabase
    .from("books")
    .select("id, user_id, name, nickname, gender, date_of_birth, country, relationship")
    .eq("id", bookId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Book not found");
  return data;
}

export const getManuscript = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bookId: string }) =>
    z.object({ bookId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureBookAccess(context.supabase, data.bookId);

    const { data: manuscript, error: mErr } = await context.supabase
      .from("book_manuscripts")
      .select("*")
      .eq("book_id", data.bookId)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);

    const { data: chapters, error: cErr } = await context.supabase
      .from("book_chapters")
      .select("*")
      .eq("book_id", data.bookId)
      .order("position");
    if (cErr) throw new Error(cErr.message);

    return { manuscript, chapters: chapters ?? [] };
  });

export const setTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bookId: string; theme: BookThemeId }) =>
    z.object({ bookId: z.string().uuid(), theme: themeEnum }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureBookAccess(context.supabase, data.bookId);
    const { error } = await context.supabase
      .from("book_manuscripts")
      .upsert(
        { book_id: data.bookId, user_id: context.userId, theme: data.theme },
        { onConflict: "book_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      chapterId: string;
      bookId: string;
      title?: string;
      narrative?: string;
      timeline?: Array<{ year: string; event: string }>;
      quotes?: string[];
    }) =>
      z
        .object({
          chapterId: z.string().uuid(),
          bookId: z.string().uuid(),
          title: z.string().max(200).optional(),
          narrative: z.string().max(50000).optional(),
          timeline: z
            .array(z.object({ year: z.string().max(50), event: z.string().max(500) }))
            .optional(),
          quotes: z.array(z.string().max(1000)).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureBookAccess(context.supabase, data.bookId);
    const patch: {
      title?: string;
      narrative?: string;
      timeline?: Array<{ year: string; event: string }>;
      quotes?: string[];
    } = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.narrative !== undefined) patch.narrative = data.narrative;
    if (data.timeline !== undefined) patch.timeline = data.timeline;
    if (data.quotes !== undefined) patch.quotes = data.quotes;

    const { error } = await context.supabase
      .from("book_chapters")
      .update(patch)
      .eq("id", data.chapterId)
      .eq("book_id", data.bookId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });



export const updateManuscriptText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { bookId: string; introduction?: string; ending?: string }) =>
      z
        .object({
          bookId: z.string().uuid(),
          introduction: z.string().max(20000).optional(),
          ending: z.string().max(20000).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureBookAccess(context.supabase, data.bookId);
    const patch: {
      book_id: string;
      user_id: string;
      introduction?: string;
      ending?: string;
    } = { book_id: data.bookId, user_id: context.userId };
    if (data.introduction !== undefined) patch.introduction = data.introduction;
    if (data.ending !== undefined) patch.ending = data.ending;
    const { error } = await context.supabase
      .from("book_manuscripts")
      .upsert(patch, { onConflict: "book_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function callAi(
  promptKey: string,
  vars: Record<string, string>,
  ctx?: { userId?: string; bookId?: string },
): Promise<string> {
  const { runAi, renderPrompt } = await import("@/lib/ai/dispatcher.server");
  const { system, user } = await renderPrompt(promptKey, vars);
  const res = await runAi({
    system: system ?? undefined,
    user,
    promptKey,
    userId: ctx?.userId,
    bookId: ctx?.bookId,
  });
  return res.text;
}

function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  return JSON.parse(slice) as T;
}

export const generateBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bookId: string }) =>
    z.object({ bookId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const book = await ensureBookAccess(context.supabase, data.bookId);

    const { data: qaRows, error: qErr } = await context.supabase
      .from("interview_qa")
      .select("topic, position, question, answer")
      .eq("book_id", data.bookId)
      .order("topic")
      .order("position");
    if (qErr) throw new Error(qErr.message);

    const answered = (qaRows ?? []).filter((q) => q.answer && q.answer.trim().length > 0);
    if (answered.length < 3) {
      throw new Error("Please answer a few interview questions before generating the book.");
    }

    const subject = [
      book.name,
      book.nickname ? `(nickname: ${book.nickname})` : "",
      book.gender ? `gender: ${book.gender}` : "",
      book.date_of_birth ? `born: ${book.date_of_birth}` : "",
      book.country ? `country: ${book.country}` : "",
      book.relationship ? `relationship: ${book.relationship}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    const byTopic = new Map<string, Array<{ question: string; answer: string }>>();
    for (const row of answered) {
      const arr = byTopic.get(row.topic) ?? [];
      arr.push({ question: row.question, answer: row.answer });
      byTopic.set(row.topic, arr);
    }

    const topicsWithAnswers = INTERVIEW_TOPICS.filter((t) => byTopic.has(t));

    // Ensure manuscript row exists
    await context.supabase
      .from("book_manuscripts")
      .upsert(
        { book_id: data.bookId, user_id: context.userId },
        { onConflict: "book_id", ignoreDuplicates: true },
      );

    // Generate each chapter
    for (let i = 0; i < topicsWithAnswers.length; i++) {
      const topic = topicsWithAnswers[i];
      const qa = byTopic.get(topic)!;
      const qaText = qa.map((q, idx) => `Q${idx + 1}: ${q.question}\nA${idx + 1}: ${q.answer}`).join("\n\n");

      const raw = await callAi(
        "biography_chapter",
        {
          subject,
          index: String(i + 1),
          total: String(topicsWithAnswers.length),
          topic,
          qa_text: qaText,
        },
        { userId: context.userId, bookId: data.bookId },
      );
      let parsed: {
        title: string;
        narrative: string;
        timeline: Array<{ year: string; event: string }>;
        quotes: string[];
      };
      try {
        parsed = extractJson(raw);
      } catch {
        parsed = { title: topic, narrative: raw, timeline: [], quotes: [] };
      }

      await context.supabase.from("book_chapters").upsert(
        {
          book_id: data.bookId,
          user_id: context.userId,
          topic,
          position: i + 1,
          title: parsed.title ?? topic,
          narrative: parsed.narrative ?? "",
          timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
          quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
        },
        { onConflict: "book_id,topic" },
      );
    }

    // Introduction & ending
    const overview = topicsWithAnswers
      .map((t) => `${t}: ${byTopic.get(t)!.length} answers`)
      .join("; ");

    const introRaw = await callAi("biography_intro", { subject, overview }, { userId: context.userId, bookId: data.bookId });
    const endingRaw = await callAi("biography_ending", { subject }, { userId: context.userId, bookId: data.bookId });

    let introduction = "";
    let ending = "";
    try { introduction = extractJson<{ text: string }>(introRaw).text ?? introRaw; } catch { introduction = introRaw; }
    try { ending = extractJson<{ text: string }>(endingRaw).text ?? endingRaw; } catch { ending = endingRaw; }

    await context.supabase
      .from("book_manuscripts")
      .upsert(
        {
          book_id: data.bookId,
          user_id: context.userId,
          introduction,
          ending,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "book_id" },
      );

    await context.supabase
      .from("books")
      .update({ status: "in_progress", progress: 80 })
      .eq("id", data.bookId);

    // Best-effort book_ready notification
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", context.userId)
        .maybeSingle();
      if (profile?.email) {
        const { sendTemplatedEmail } = await import("./email.functions");
        await sendTemplatedEmail({
          templateKey: "book_ready",
          to: profile.email,
          variables: {
            customer_name: profile.full_name ?? "there",
            book_title: subject,
            book_url: `/books/${data.bookId}/manuscript`,
          },
        });
      }
    } catch (e) {
      console.error("[book_ready email] failed:", (e as Error).message);
    }

    return { ok: true, chapters: topicsWithAnswers.length };
  });
