import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const INTERVIEW_TOPICS = [
  "Childhood",
  "School Life",
  "First Job",
  "Love Story",
  "Marriage",
  "Children",
  "Career",
  "Biggest Challenges",
  "Greatest Achievements",
  "Retirement",
  "Advice for Future Generations",
] as const;

export type InterviewTopic = (typeof INTERVIEW_TOPICS)[number];

const MIN_Q = 3;
const MAX_Q = 6;

async function ensureBookAccess(supabase: any, bookId: string) {
  const { data, error } = await supabase
    .from("books")
    .select("id, name, nickname, gender, date_of_birth, country, relationship")
    .eq("id", bookId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Book not found");
  return data;
}

export const getInterviewState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bookId: string }) =>
    z.object({ bookId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const book = await ensureBookAccess(context.supabase, data.bookId);

    const { data: topicsRows, error: tErr } = await context.supabase
      .from("interview_topics")
      .select("topic, status, completed_at")
      .eq("book_id", data.bookId);
    if (tErr) throw new Error(tErr.message);

    const { data: qaRows, error: qErr } = await context.supabase
      .from("interview_qa")
      .select("id, topic, position, question, answer, updated_at")
      .eq("book_id", data.bookId)
      .order("topic")
      .order("position");
    if (qErr) throw new Error(qErr.message);

    const topicMap = new Map<string, { status: string; completed_at: string | null }>();
    for (const t of topicsRows ?? []) {
      topicMap.set(t.topic, { status: t.status, completed_at: t.completed_at });
    }

    const qaByTopic: Record<string, typeof qaRows> = {};
    for (const row of qaRows ?? []) {
      (qaByTopic[row.topic] ??= []).push(row);
    }

    const topics = INTERVIEW_TOPICS.map((topic) => {
      const qas = qaByTopic[topic] ?? [];
      const answered = qas.filter((q) => q.answer && q.answer.trim().length > 0).length;
      const state = topicMap.get(topic);
      return {
        topic,
        status: state?.status ?? "not_started",
        completed_at: state?.completed_at ?? null,
        answered,
        total: qas.length,
        can_complete: answered >= MIN_Q,
        max_reached: qas.length >= MAX_Q,
        qa: qas,
      };
    });

    const totalAnswered = topics.reduce((s, t) => s + t.answered, 0);
    const completedTopics = topics.filter((t) => t.status === "completed").length;

    return {
      book,
      topics,
      totalAnswered,
      completedTopics,
      totalTopics: INTERVIEW_TOPICS.length,
      minPerTopic: MIN_Q,
      maxPerTopic: MAX_Q,
    };
  });

export const saveAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { qaId: string; bookId: string; answer: string }) =>
    z
      .object({
        qaId: z.string().uuid(),
        bookId: z.string().uuid(),
        answer: z.string().max(10000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureBookAccess(context.supabase, data.bookId);

    const { data: qa, error } = await context.supabase
      .from("interview_qa")
      .update({ answer: data.answer })
      .eq("id", data.qaId)
      .eq("book_id", data.bookId)
      .select("topic")
      .single();
    if (error) throw new Error(error.message);

    // Bump topic status to in_progress if not_started
    await context.supabase
      .from("interview_topics")
      .upsert(
        { book_id: data.bookId, topic: qa.topic, status: "in_progress" },
        { onConflict: "book_id,topic", ignoreDuplicates: false },
      );

    return { ok: true };
  });

export const generateNextQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bookId: string; topic: string }) =>
    z
      .object({
        bookId: z.string().uuid(),
        topic: z.enum(INTERVIEW_TOPICS as unknown as [string, ...string[]]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const book = await ensureBookAccess(context.supabase, data.bookId);

    // Existing questions in this topic
    const { data: existing, error: eErr } = await context.supabase
      .from("interview_qa")
      .select("id, position, question, answer")
      .eq("book_id", data.bookId)
      .eq("topic", data.topic)
      .order("position");
    if (eErr) throw new Error(eErr.message);

    if (existing.length >= MAX_Q) {
      throw new Error(`Maximum ${MAX_Q} questions reached for this topic.`);
    }

    // All prior questions across topics (avoid repeats globally)
    const { data: allQ, error: aErr } = await context.supabase
      .from("interview_qa")
      .select("topic, question")
      .eq("book_id", data.bookId);
    if (aErr) throw new Error(aErr.message);

    const priorQuestions = (allQ ?? []).map((q) => `- (${q.topic}) ${q.question}`).join("\n");
    const topicQA = existing
      .map(
        (q, i) =>
          `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer?.trim() || "(no answer yet)"}`,
      )
      .join("\n\n");

    const subject = [
      book.name,
      book.nickname ? `(nickname: ${book.nickname})` : "",
      book.gender ? `gender: ${book.gender}` : "",
      book.date_of_birth ? `born: ${book.date_of_birth}` : "",
      book.country ? `country: ${book.country}` : "",
      book.relationship ? `relationship to the interviewer: ${book.relationship}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    const { runAi, renderPrompt } = await import("@/lib/ai/dispatcher.server");
    const { system, user } = await renderPrompt("interview_question", {
      subject,
      topic: data.topic,
      topic_qa: topicQA || "(none yet — this is the first question)",
      prior_questions: priorQuestions || "(none)",
    });

    const ai = await runAi({
      system: system ?? undefined,
      user,
      promptKey: "interview_question",
      userId: context.userId,
      bookId: data.bookId,
    });
    const question = ai.text.trim();
    if (!question) throw new Error("AI did not return a question. Please try again.");

    const position = existing.length + 1;

    const { data: qa, error: insErr } = await context.supabase
      .from("interview_qa")
      .insert({
        book_id: data.bookId,
        topic: data.topic,
        position,
        question,
        answer: "",
      })
      .select("id, topic, position, question, answer")
      .single();
    if (insErr) throw new Error(insErr.message);

    await context.supabase
      .from("interview_topics")
      .upsert(
        { book_id: data.bookId, topic: data.topic, status: "in_progress" },
        { onConflict: "book_id,topic", ignoreDuplicates: false },
      );

    return qa;
  });

export const setTopicStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { bookId: string; topic: string; status: "in_progress" | "completed" }) =>
      z
        .object({
          bookId: z.string().uuid(),
          topic: z.enum(INTERVIEW_TOPICS as unknown as [string, ...string[]]),
          status: z.enum(["in_progress", "completed"]),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureBookAccess(context.supabase, data.bookId);

    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "completed") patch.completed_at = new Date().toISOString();
    else patch.completed_at = null;

    const { error } = await context.supabase
      .from("interview_topics")
      .upsert(
        { book_id: data.bookId, topic: data.topic, ...patch },
        { onConflict: "book_id,topic", ignoreDuplicates: false },
      );
    if (error) throw new Error(error.message);

    return { ok: true };
  });
