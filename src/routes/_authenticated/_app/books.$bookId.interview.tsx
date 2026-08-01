import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Loader2,
  Mic,
  MicOff,
  PauseCircle,
  PlayCircle,
  Sparkles,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import {
  getInterviewState,
  generateNextQuestion,
  saveAnswer,
  setTopicStatus,
} from "@/lib/interview.functions";

const interviewQueryOptions = (bookId: string) =>
  queryOptions({
    queryKey: ["interview", bookId],
    queryFn: () => getInterviewState({ data: { bookId } }),
  });

export const Route = createFileRoute("/_authenticated/_app/books/$bookId/interview")({
  head: () => ({
    meta: [
      { title: "AI Interview — My Family History Book" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InterviewPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border/60 bg-background p-8 text-center">
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  ),
});

type TopicState = Awaited<ReturnType<typeof getInterviewState>>["topics"][number];

function InterviewPage() {
  const { bookId } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: state, isLoading } = useQuery(interviewQueryOptions(bookId));

  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [answerDraft, setAnswerDraft] = useState<string>("");
  const [paused, setPaused] = useState(false);
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [interimText, setInterimText] = useState("");

  const speech = useSpeechToText({
    onAppend: (finalChunk) => {
      setAnswerDraft((prev) => {
        const sep = prev && !/\s$/.test(prev) ? " " : "";
        return prev + sep + finalChunk.trim();
      });
      setInterimText("");
    },
    onInterim: (t) => setInterimText(t),
  });

  // Initialize active topic once state loads
  useEffect(() => {
    if (!state || activeTopic) return;
    const firstIncomplete = state.topics.find((t) => t.status !== "completed") ?? state.topics[0];
    setActiveTopic(firstIncomplete.topic);
    const lastIdx = Math.max(0, firstIncomplete.qa.length - 1);
    setActiveIndex(lastIdx);
  }, [state, activeTopic]);

  const currentTopic: TopicState | undefined = useMemo(
    () => state?.topics.find((t) => t.topic === activeTopic),
    [state, activeTopic],
  );

  const currentQA = currentTopic?.qa[activeIndex];

  // Sync draft when moving to a different QA
  const lastLoadedQaId = useRef<string | null>(null);
  useEffect(() => {
    if (currentQA && currentQA.id !== lastLoadedQaId.current) {
      setAnswerDraft(currentQA.answer ?? "");
      lastLoadedQaId.current = currentQA.id;
      setSavingStatus("idle");
    }
  }, [currentQA]);

  const saveFn = useServerFn(saveAnswer);
  const generateFn = useServerFn(generateNextQuestion);
  const topicStatusFn = useServerFn(setTopicStatus);

  const saveMutation = useMutation({
    mutationFn: (vars: { qaId: string; answer: string }) =>
      saveFn({ data: { qaId: vars.qaId, bookId, answer: vars.answer } }),
    onMutate: () => setSavingStatus("saving"),
    onSuccess: () => {
      setSavingStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["interview", bookId] });
    },
    onError: (e: Error) => {
      setSavingStatus("idle");
      toast.error(e.message);
    },
  });

  // Autosave (debounced) whenever the draft changes for the current QA
  useEffect(() => {
    if (!currentQA) return;
    if (paused) return;
    if (answerDraft === (currentQA.answer ?? "")) return;
    const timeout = setTimeout(() => {
      saveMutation.mutate({ qaId: currentQA.id, answer: answerDraft });
    }, 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerDraft, currentQA?.id, paused]);

  const generateMutation = useMutation({
    mutationFn: (topic: string) => generateFn({ data: { bookId, topic } }),
    onSuccess: async (qa) => {
      await queryClient.invalidateQueries({ queryKey: ["interview", bookId] });
      const fresh = queryClient.getQueryData<Awaited<ReturnType<typeof getInterviewState>>>([
        "interview",
        bookId,
      ]);
      const t = fresh?.topics.find((x) => x.topic === qa.topic);
      if (t) setActiveIndex(t.qa.length - 1);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const topicStatusMutation = useMutation({
    mutationFn: (vars: { topic: string; status: "in_progress" | "completed" }) =>
      topicStatusFn({ data: { bookId, ...vars } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview", bookId] });
      router.invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const flushSave = async () => {
    if (!currentQA) return;
    if (answerDraft !== (currentQA.answer ?? "")) {
      await saveMutation.mutateAsync({ qaId: currentQA.id, answer: answerDraft });
    }
  };

  const handlePrev = async () => {
    await flushSave();
    if (activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const goToNextIncompleteTopic = async () => {
    if (!state || !currentTopic) return;
    const currentIdx = state.topics.findIndex((t) => t.topic === currentTopic.topic);
    const after = state.topics.slice(currentIdx + 1);
    const before = state.topics.slice(0, currentIdx);
    const next =
      after.find((t) => t.status !== "completed") ??
      before.find((t) => t.status !== "completed");
    if (next) {
      await handleTopicSwitch(next.topic);
      toast.success(`Moving on to "${next.topic}"`);
    } else {
      toast.success("All topics answered! Generate your manuscript next.");
      router.navigate({ to: "/books/$bookId/manuscript", params: { bookId } });
    }
  };

  const handleNext = async () => {
    if (!currentTopic) return;
    await flushSave();
    if (activeIndex < currentTopic.qa.length - 1) {
      setActiveIndex(activeIndex + 1);
      return;
    }
    if (currentTopic.qa.length >= state!.maxPerTopic) {
      // Auto-complete this topic if eligible, then jump to next
      if (currentTopic.can_complete && currentTopic.status !== "completed") {
        await topicStatusMutation.mutateAsync({
          topic: currentTopic.topic,
          status: "completed",
        });
      }
      await goToNextIncompleteTopic();
      return;
    }
    generateMutation.mutate(currentTopic.topic);
  };

  const handleTopicSwitch = async (topic: string) => {
    await flushSave();
    setActiveTopic(topic);
    const t = state?.topics.find((x) => x.topic === topic);
    setActiveIndex(t ? Math.max(0, t.qa.length - 1) : 0);
  };

  const allTopicsCompleted =
    !!state && state.completedTopics === state.totalTopics;

  if (isLoading || !state) {
    return (
      <div className="mx-auto max-w-4xl text-center text-muted-foreground">
        Loading interview…
      </div>
    );
  }

  const overallProgress = Math.round(
    (state.completedTopics / state.totalTopics) * 100,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to="/books/$bookId"
        params={{ bookId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to book
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Interview</h1>
          <p className="mt-1 text-muted-foreground">
            Answer one question at a time. Every response is saved automatically.
          </p>
        </div>
        <div className="min-w-[220px] rounded-2xl border border-border/60 bg-background p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall progress</span>
            <span className="text-muted-foreground">
              {state.completedTopics}/{state.totalTopics}
            </span>
          </div>
          <Progress value={overallProgress} className="mt-2 h-1.5" />
          <p className="mt-2 text-xs text-muted-foreground">
            {state.totalAnswered} answers saved
          </p>
        </div>
      </div>

      {allTopicsCompleted && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 text-primary" />
            <div>
              <p className="font-semibold">All interview topics completed 🎉</p>
              <p className="text-sm text-muted-foreground">
                You're ready to turn these answers into a beautiful manuscript.
              </p>
            </div>
          </div>
          <Button asChild size="lg">
            <Link to="/books/$bookId/manuscript" params={{ bookId }}>
              Continue to Manuscript <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Topic sidebar */}
        <aside className="rounded-2xl border border-border/60 bg-background p-3">
          <h2 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Topics
          </h2>
          <ul className="space-y-1">
            {state.topics.map((t) => {
              const active = t.topic === activeTopic;
              const done = t.status === "completed";
              return (
                <li key={t.topic}>
                  <button
                    onClick={() => handleTopicSwitch(t.topic)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">{t.topic}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.answered}/{state.maxPerTopic}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Interview panel */}
        <section className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
          {!currentTopic ? (
            <p className="text-muted-foreground">Select a topic to begin.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{currentTopic.topic}</h2>
                  {currentTopic.status === "completed" && (
                    <Badge>Completed</Badge>
                  )}
                  {currentTopic.status === "in_progress" && (
                    <Badge variant="secondary">In progress</Badge>
                  )}
                </div>
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  {paused ? (
                    <>
                      <PlayCircle className="h-4 w-4" /> Resume
                    </>
                  ) : (
                    <>
                      <PauseCircle className="h-4 w-4" /> Pause
                    </>
                  )}
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Question {currentTopic.qa.length === 0 ? 0 : activeIndex + 1} of{" "}
                  {currentTopic.qa.length}
                </span>
                <span>·</span>
                <span>Min {state.minPerTopic} · Max {state.maxPerTopic}</span>
                <SaveIndicator status={savingStatus} />
              </div>

              {paused ? (
                <div className="mt-8 rounded-xl bg-muted/40 p-8 text-center">
                  <PauseCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 font-medium">Interview paused</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your last answer is saved. Resume whenever you're ready.
                  </p>
                  <Button className="mt-4" onClick={() => setPaused(false)}>
                    <PlayCircle className="mr-2 h-4 w-4" /> Resume
                  </Button>
                </div>
              ) : currentTopic.qa.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed border-border/70 p-8 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-primary" />
                  <p className="mt-3 font-medium">Ready to begin "{currentTopic.topic}"?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We'll ask one question at a time.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => generateMutation.mutate(currentTopic.topic)}
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" /> Start topic
                      </>
                    )}
                  </Button>
                </div>
              ) : currentQA ? (
                <>
                  <div className="mt-6 rounded-xl bg-muted/40 p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <p className="text-base leading-relaxed">{currentQA.question}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="answer" className="text-sm font-medium">
                        Your answer
                      </label>
                      {speech.supported ? (
                        <Button
                          type="button"
                          size="sm"
                          variant={speech.listening ? "default" : "outline"}
                          onClick={speech.toggle}
                          className={speech.listening ? "animate-pulse" : ""}
                        >
                          {speech.listening ? (
                            <>
                              <MicOff className="mr-1.5 h-4 w-4" /> Stop dictation
                            </>
                          ) : (
                            <>
                              <Mic className="mr-1.5 h-4 w-4" /> Speak your answer
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Voice input not supported in this browser
                        </span>
                      )}
                    </div>
                    <div className="relative mt-2">
                      <Textarea
                        id="answer"
                        value={answerDraft + (interimText ? (answerDraft && !/\s$/.test(answerDraft) ? " " : "") + interimText : "")}
                        onChange={(e) => {
                          // When user types, drop any interim buffer to avoid conflict
                          setInterimText("");
                          setAnswerDraft(e.target.value);
                        }}
                        placeholder="Take your time. Share as much or as little as feels right… or tap the mic to speak."
                        rows={8}
                      />
                      {speech.listening && (
                        <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                          Listening…
                        </span>
                      )}
                    </div>
                    {speech.error && (
                      <p className="mt-1 text-xs text-destructive">
                        {speech.error === "not-allowed"
                          ? "Microphone permission denied. Enable it in your browser settings."
                          : `Voice error: ${speech.error}`}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {currentTopic.can_complete
                        ? currentTopic.qa.length >= state.maxPerTopic
                          ? `You've reached ${state.maxPerTopic} questions. Click "Next topic" to continue.`
                          : `Great — you've answered enough for this topic. Add more with "Next question", or click "Mark topic complete" to move on.`
                        : `Answer at least ${state.minPerTopic - currentTopic.answered} more question${
                            state.minPerTopic - currentTopic.answered === 1 ? "" : "s"
                          } to complete this topic. Click "Next question" when ready.`}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      onClick={handlePrev}
                      disabled={activeIndex === 0}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                    </Button>

                    <div className="flex items-center gap-2">
                      {currentTopic.can_complete && currentTopic.status !== "completed" && (
                        <Button
                          variant="outline"
                          onClick={async () => {
                            await flushSave();
                            await topicStatusMutation.mutateAsync({
                              topic: currentTopic.topic,
                              status: "completed",
                            });
                            await goToNextIncompleteTopic();
                          }}
                          disabled={topicStatusMutation.isPending}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Mark topic complete
                        </Button>
                      )}
                      {currentTopic.status === "completed" && (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            topicStatusMutation.mutate({
                              topic: currentTopic.topic,
                              status: "in_progress",
                            })
                          }
                        >
                          Reopen topic
                        </Button>
                      )}
                      <Button
                        onClick={handleNext}
                        disabled={generateMutation.isPending}
                      >
                        {generateMutation.isPending &&
                        activeIndex === currentTopic.qa.length - 1 ? (
                          <>
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Generating…
                          </>
                        ) : activeIndex < currentTopic.qa.length - 1 ? (
                          <>
                            Next <ChevronRight className="ml-1 h-4 w-4" />
                          </>
                        ) : currentTopic.qa.length >= state.maxPerTopic ? (
                          <>Next topic</>
                        ) : (
                          <>
                            Next question <Sparkles className="ml-1 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" }) {
  if (status === "saving")
    return (
      <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  if (status === "saved")
    return (
      <span className="ml-auto inline-flex items-center gap-1 text-xs text-primary">
        <Save className="h-3 w-3" /> Saved
      </span>
    );
  return <span className="ml-auto" />;
}
