import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Sparkles, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  BOOK_THEMES,
  type BookThemeId,
  generateBook,
  getManuscript,
  setTheme,
  updateChapter,
  updateManuscriptText,
} from "@/lib/manuscript.functions";

const manuscriptQueryOptions = (bookId: string) =>
  queryOptions({
    queryKey: ["manuscript", bookId],
    queryFn: () => getManuscript({ data: { bookId } }),
  });

export const Route = createFileRoute("/_authenticated/_app/books/$bookId/manuscript")({
  head: () => ({
    meta: [
      { title: "Manuscript — My Family History Book" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManuscriptPage,
});

type Chapter = {
  id: string;
  topic: string;
  position: number;
  title: string;
  narrative: string;
  timeline: Array<{ year: string; event: string }>;
  quotes: string[];
};

function ManuscriptPage() {
  const { bookId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(manuscriptQueryOptions(bookId));

  const generateFn = useServerFn(generateBook);
  const setThemeFn = useServerFn(setTheme);

  const generateMutation = useMutation({
    mutationFn: () => generateFn({ data: { bookId } }),
    onSuccess: () => {
      toast.success("Book generated");
      queryClient.invalidateQueries({ queryKey: ["manuscript", bookId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const themeMutation = useMutation({
    mutationFn: (theme: BookThemeId) => setThemeFn({ data: { bookId, theme } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manuscript", bookId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="mx-auto max-w-4xl text-center text-muted-foreground">Loading…</div>;
  }

  const theme = (data.manuscript?.theme ?? "classic") as BookThemeId;
  const hasContent = (data.chapters?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/books/$bookId"
        params={{ bookId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to book
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Manuscript</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn the interview into a professional biography. Edit anything — changes autosave.
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          size="lg"
        >
          {generateMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing…</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" /> {hasContent ? "Regenerate book" : "Generate book"}</>
          )}
        </Button>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Book theme</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {BOOK_THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                onClick={() => themeMutation.mutate(t.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/40"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.label}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {!hasContent ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border/60 bg-background p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-primary" />
          <h3 className="mt-3 font-semibold">Your book hasn't been written yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Answer some interview questions, then click <strong>Generate book</strong> — Gemini will
            craft chapter titles, narrative, a timeline, and pull-quotes.
          </p>
        </div>
      ) : (
        <ManuscriptEditor
          bookId={bookId}
          introduction={data.manuscript?.introduction ?? ""}
          ending={data.manuscript?.ending ?? ""}
          chapters={(data.chapters ?? []) as unknown as Chapter[]}
        />
      )}
    </div>
  );
}

function ManuscriptEditor({
  bookId,
  introduction,
  ending,
  chapters,
}: {
  bookId: string;
  introduction: string;
  ending: string;
  chapters: Chapter[];
}) {
  return (
    <div className="mt-10 space-y-8">
      <IntroEndingBlock bookId={bookId} label="Introduction" field="introduction" initial={introduction} />
      {chapters.map((ch) => (
        <ChapterEditor key={ch.id} bookId={bookId} chapter={ch} />
      ))}
      <IntroEndingBlock bookId={bookId} label="Ending Message" field="ending" initial={ending} />
    </div>
  );
}

function useAutosaveIndicator() {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markSaving = () => setState("saving");
  const markSaved = () => {
    setState("saved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1500);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { state, markSaving, markSaved };
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "saving") return <span className="text-xs text-muted-foreground">Saving…</span>;
  if (state === "saved") return <span className="text-xs text-primary">Saved</span>;
  return null;
}

function IntroEndingBlock({
  bookId,
  label,
  field,
  initial,
}: {
  bookId: string;
  label: string;
  field: "introduction" | "ending";
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  const updateFn = useServerFn(updateManuscriptText);
  const indicator = useAutosaveIndicator();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === initial) return;
    if (timer.current) clearTimeout(timer.current);
    indicator.markSaving();
    timer.current = setTimeout(async () => {
      try {
        await updateFn({ data: { bookId, [field]: value } });
        indicator.markSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="rounded-2xl border border-border/60 bg-background p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{label}</h3>
        <SaveBadge state={indicator.state} />
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={8}
        className="mt-3 leading-relaxed"
        placeholder={`Write the ${label.toLowerCase()}…`}
      />
    </div>
  );
}

function ChapterEditor({ bookId, chapter }: { bookId: string; chapter: Chapter }) {
  const [title, setTitle] = useState(chapter.title);
  const [narrative, setNarrative] = useState(chapter.narrative);
  const [timeline, setTimeline] = useState(chapter.timeline);
  const [quotes, setQuotes] = useState(chapter.quotes);

  useEffect(() => setTitle(chapter.title), [chapter.title]);
  useEffect(() => setNarrative(chapter.narrative), [chapter.narrative]);
  useEffect(() => setTimeline(chapter.timeline), [chapter.timeline]);
  useEffect(() => setQuotes(chapter.quotes), [chapter.quotes]);

  const updateFn = useServerFn(updateChapter);
  const indicator = useAutosaveIndicator();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const payload = useMemo(
    () => ({ title, narrative, timeline, quotes }),
    [title, narrative, timeline, quotes],
  );
  const initialKey = useMemo(
    () => JSON.stringify({ title: chapter.title, narrative: chapter.narrative, timeline: chapter.timeline, quotes: chapter.quotes }),
    [chapter],
  );
  const currentKey = JSON.stringify(payload);

  useEffect(() => {
    if (currentKey === initialKey) return;
    if (timer.current) clearTimeout(timer.current);
    indicator.markSaving();
    timer.current = setTimeout(async () => {
      try {
        await updateFn({ data: { chapterId: chapter.id, bookId, ...payload } });
        indicator.markSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  return (
    <article className="rounded-2xl border border-border/60 bg-background p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="secondary">Chapter {chapter.position} · {chapter.topic}</Badge>
        <SaveBadge state={indicator.state} />
      </div>

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-3 text-xl font-semibold"
        placeholder="Chapter title"
      />

      <div className="mt-4">
        <label className="text-sm font-medium">Narrative</label>
        <Textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={14}
          className="mt-2 leading-relaxed"
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Timeline</label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setTimeline([...timeline, { year: "", event: "" }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <div className="mt-2 space-y-2">
          {timeline.length === 0 && (
            <p className="text-xs text-muted-foreground">No timeline entries yet.</p>
          )}
          {timeline.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={entry.year}
                onChange={(e) => {
                  const next = [...timeline];
                  next[i] = { ...next[i], year: e.target.value };
                  setTimeline(next);
                }}
                placeholder="Year"
                className="w-32"
              />
              <Input
                value={entry.event}
                onChange={(e) => {
                  const next = [...timeline];
                  next[i] = { ...next[i], event: e.target.value };
                  setTimeline(next);
                }}
                placeholder="Event"
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setTimeline(timeline.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Quotes</label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setQuotes([...quotes, ""])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <div className="mt-2 space-y-2">
          {quotes.length === 0 && (
            <p className="text-xs text-muted-foreground">No pull-quotes yet.</p>
          )}
          {quotes.map((q, i) => (
            <div key={i} className="flex gap-2">
              <Textarea
                value={q}
                onChange={(e) => {
                  const next = [...quotes];
                  next[i] = e.target.value;
                  setQuotes(next);
                }}
                rows={2}
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setQuotes(quotes.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
