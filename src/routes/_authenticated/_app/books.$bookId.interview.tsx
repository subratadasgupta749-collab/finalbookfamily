import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
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
  Clock,
  AlertCircle,
  Bookmark,
  Check,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    queryFn: async () => {
      console.log("[Interview] Database Read - Fetching interview state");
      const res = await getInterviewState({ data: { bookId } });
      return res;
    },
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
type SaveStatus = "idle" | "saving" | "saved" | "failed";

function InterviewPage() {
  const { bookId } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Debug: Track component mounts, unmounts, and re-renders
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  console.log(`[Interview] Component Re-render #${renderCountRef.current}`);

  useEffect(() => {
    console.log("[Interview] Component Mount");
    return () => {
      console.log("[Interview] Component Unmount");
    };
  }, []);

  const { data: state, isLoading } = useQuery(interviewQueryOptions(bookId));

  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [paused, setPaused] = useState(false);
  const [savingStatus, setSavingStatus] = useState<SaveStatus>("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [activeSpeechQaId, setActiveSpeechQaId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // References to decouple server query refetches from active local state editing
  const savedAnswersRef = useRef<Record<string, string>>({});
  const activeTopicRef = useRef<string | null>(null);
  const activeSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveFn = useServerFn(saveAnswer);
  const generateFn = useServerFn(generateNextQuestion);
  const topicStatusFn = useServerFn(setTopicStatus);

  // Initialize active topic and current step from state / localStorage
  useEffect(() => {
    if (!state || activeTopic) return;
    const firstIncomplete = state.topics.find((t) => t.status !== "completed") ?? state.topics[0];
    const initialTopic = firstIncomplete.topic;
    setActiveTopic(initialTopic);

    // Restore step from localStorage if present
    const savedStep = localStorage.getItem(`interview_step_${bookId}_${initialTopic}`);
    if (savedStep) {
      setCurrentStep(parseInt(savedStep, 10) || 0);
    } else {
      setCurrentStep(0);
    }
  }, [state, activeTopic, bookId]);

  const currentTopic: TopicState | undefined = useMemo(
    () => state?.topics.find((t) => t.topic === activeTopic),
    [state, activeTopic],
  );

  // Initialize local drafts ONLY when switching topic or on initial topic load
  // Local state MUST NEVER be overwritten by server refetches while typing!
  useEffect(() => {
    if (!currentTopic) return;
    const isTopicChanged = activeTopicRef.current !== currentTopic.topic;
    activeTopicRef.current = currentTopic.topic;

    setDrafts((prevDrafts) => {
      const nextDrafts = { ...prevDrafts };
      for (const q of currentTopic.qa) {
        // Check for local backup in localStorage first (offline safety)
        const backup = typeof window !== "undefined"
          ? localStorage.getItem(`interview_draft_${bookId}_${q.id}`)
          : null;

        // Populate savedAnswersRef for change comparison
        savedAnswersRef.current[q.id] = q.answer ?? "";

        // If topic switched, or draft is not set yet, populate draft
        if (isTopicChanged || nextDrafts[q.id] === undefined) {
          nextDrafts[q.id] = backup ?? q.answer ?? "";
        }
      }
      return nextDrafts;
    });

    setValidationError(null);
  }, [currentTopic, bookId]);

  // Speech-to-text hook
  const speech = useSpeechToText({
    onAppend: (finalChunk) => {
      if (!activeSpeechQaId) return;
      console.log(`[Interview] Speech input appended for ${activeSpeechQaId}`);
      setDrafts((prev) => {
        const cur = prev[activeSpeechQaId] || "";
        const sep = cur && !/\s$/.test(cur) ? " " : "";
        const updated = cur + sep + finalChunk.trim();
        try {
          localStorage.setItem(`interview_draft_${bookId}_${activeSpeechQaId}`, updated);
        } catch {}
        return { ...prev, [activeSpeechQaId]: updated };
      });
    },
  });

  // Handle Textarea Change (Controlled Local State update)
  const handleTextareaChange = useCallback(
    (qaId: string, newValue: string) => {
      console.log(`[Interview] Input Changed for ${qaId}: length ${newValue.length}`);
      setDrafts((prev) => {
        console.log(`[Interview] Local State Updated for ${qaId}`);
        return { ...prev, [qaId]: newValue };
      });

      // Save offline backup to localStorage immediately
      try {
        localStorage.setItem(`interview_draft_${bookId}_${qaId}`, newValue);
      } catch {}

      setValidationError(null);
    },
    [bookId],
  );

  const questionsPerStep = state?.questionsPerStep ?? 3;

  // Batch Auto-Save Engine for Current Step with Race Condition Safeguards
  const flushSaveCurrentStep = useCallback(async (): Promise<boolean> => {
    // Clear any pending debounced timeout
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // If a save operation is already in-flight, await its completion
    if (activeSavePromiseRef.current) {
      try {
        const res = await activeSavePromiseRef.current;
        if (!res) return false;
      } catch {
        return false;
      }
    }

    if (!currentTopic) return true;
    const stepQas = currentTopic.qa.slice(
      currentStep * questionsPerStep,
      (currentStep + 1) * questionsPerStep,
    );

    const changed = stepQas.filter((q) => {
      const val = drafts[q.id] ?? "";
      return val !== (savedAnswersRef.current[q.id] ?? "");
    });

    if (changed.length === 0) return true;

    setSavingStatus("saving");

    const savePromise = (async (): Promise<boolean> => {
      try {
        await Promise.all(
          changed.map(async (q) => {
            const val = drafts[q.id] ?? "";
            await saveFn({ data: { qaId: q.id, bookId, answer: val } });
            savedAnswersRef.current[q.id] = val;
            try {
              localStorage.removeItem(`interview_draft_${bookId}_${q.id}`);
            } catch {}
          }),
        );

        queryClient.setQueryData(["interview", bookId], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            topics: oldData.topics.map((t: any) => ({
              ...t,
              qa: t.qa.map((q: any) => {
                const updatedVal = drafts[q.id];
                return updatedVal !== undefined ? { ...q, answer: updatedVal } : q;
              }),
            })),
          };
        });

        setSavingStatus("saved");
        setLastSavedTime(format(new Date(), "h:mm a"));
        return true;
      } catch (err: any) {
        console.error("[Interview] Auto Save Failed:", err);
        setSavingStatus("failed");
        toast.error("Failed to save answers. Please check your connection and retry.");
        return false;
      } finally {
        activeSavePromiseRef.current = null;
      }
    })();

    activeSavePromiseRef.current = savePromise;
    return savePromise;
  }, [currentTopic, currentStep, questionsPerStep, drafts, bookId, saveFn, queryClient]);

  // Fast Debounced auto-save effect (600ms timeout after user pauses typing)
  useEffect(() => {
    if (paused || !currentTopic) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      flushSaveCurrentStep();
    }, 600);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [drafts, currentTopic, paused, flushSaveCurrentStep]);

  // Window Online Event Listener for Automatic Offline Recovery
  useEffect(() => {
    const handleOnline = () => {
      console.log("[Interview] Network reconnected - retrying pending auto-saves");
      flushSaveCurrentStep();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flushSaveCurrentStep]);

  const generateMutation = useMutation({
    mutationFn: (topic: string) => generateFn({ data: { bookId, topic } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["interview", bookId] });
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

  // Helper calculations for questions step pagination
  const totalQuestionsInTopic = currentTopic?.qa.length || 0;
  const totalStepsInTopic = Math.max(1, Math.ceil(totalQuestionsInTopic / questionsPerStep));
  const currentStepQas = useMemo(() => {
    if (!currentTopic) return [];
    return currentTopic.qa.slice(
      currentStep * questionsPerStep,
      (currentStep + 1) * questionsPerStep,
    );
  }, [currentTopic, currentStep, questionsPerStep]);

  // Total target questions in section
  const targetTopicQuestions = useMemo(() => {
    if (!currentTopic) return 0;
    return Math.max(currentTopic.qa.length, state?.maxPerTopic ?? currentTopic.qa.length);
  }, [currentTopic, state?.maxPerTopic]);

  // Questions completed after finishing current step
  const completedAfterCurrentStep = useMemo(() => {
    return Math.min((currentStep + 1) * questionsPerStep, targetTopicQuestions);
  }, [currentStep, questionsPerStep, targetTopicQuestions]);

  // Remaining questions in section after completing current step
  const remainingQuestions = useMemo(() => {
    return Math.max(0, targetTopicQuestions - completedAfterCurrentStep);
  }, [targetTopicQuestions, completedAfterCurrentStep]);

  // Number of questions to be presented in the next batch
  const nextBatchCount = useMemo(() => {
    return Math.min(questionsPerStep, remainingQuestions);
  }, [questionsPerStep, remainingQuestions]);

  // Calculate estimated remaining time (approx 2 mins per unanswered question)
  const remainingUnansweredCount = useMemo(() => {
    if (!state) return 0;
    let count = 0;
    for (const t of state.topics) {
      count += Math.max(0, state.minPerTopic - t.answered);
    }
    return count;
  }, [state]);

  const estimatedMinutesLeft = Math.max(1, remainingUnansweredCount * 2);

  // Switch Topic
  const handleTopicSwitch = async (topic: string) => {
    await flushSaveCurrentStep();
    setActiveTopic(topic);
    setValidationError(null);

    const savedStep = localStorage.getItem(`interview_step_${bookId}_${topic}`);
    if (savedStep) {
      setCurrentStep(parseInt(savedStep, 10) || 0);
    } else {
      setCurrentStep(0);
    }
  };

  // Check if current topic is the last remaining topic needing completion
  const isFinalTopic = useMemo(() => {
    if (!state || !currentTopic) return false;
    const otherIncomplete = state.topics.filter(
      (t) => t.topic !== currentTopic.topic && t.status !== "completed",
    );
    return otherIncomplete.length === 0;
  }, [state, currentTopic]);

  // Step Navigation - Next Topic / Next Step with Automatic Completion Logic
  const handleNextStep = async () => {
    if (!currentTopic) return;
    setValidationError(null);

    // 1. Verify that required questions in the current step have non-empty answers
    const unansweredInStep = currentStepQas.filter((q) => {
      const val = drafts[q.id] ?? "";
      return !val || val.trim().length === 0;
    });

    if (unansweredInStep.length > 0) {
      const msg = "Please answer all questions before continuing.";
      setValidationError(msg);
      toast.error(msg);
      return;
    }

    // 2. Race Condition Protection: Ensure pending auto-save finishes and succeeds
    const saveSuccessful = await flushSaveCurrentStep();
    if (!saveSuccessful) {
      const msg = "Could not save answers to database. Please check your connection and try again.";
      setValidationError(msg);
      return;
    }

    // 3. Confirm that all step answers are persisted in savedAnswersRef
    const confirmedSaved = currentStepQas.every((q) => {
      const val = savedAnswersRef.current[q.id] ?? "";
      return val.trim().length > 0;
    });

    if (!confirmedSaved) {
      const msg = "Database save pending. Please wait a moment and try again.";
      setValidationError(msg);
      return;
    }

    // 4. If there are more steps in this topic, advance step
    if (currentStep < totalStepsInTopic - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      localStorage.setItem(`interview_step_${bookId}_${activeTopic}`, nextStep.toString());
      return;
    }

    // 5. If more questions need generation for this topic
    if (currentTopic.qa.length < state!.maxPerTopic) {
      generateMutation.mutate(currentTopic.topic);
      return;
    }

    // 6. Topic is complete -> Automatically mark current topic as Completed in DB
    if (currentTopic.status !== "completed") {
      await topicStatusMutation.mutateAsync({
        topic: currentTopic.topic,
        status: "completed",
      });
    }

    // 7. Move to next incomplete topic or finish interview
    await goToNextIncompleteTopic();
  };

  const goToNextIncompleteTopic = async () => {
    if (!state || !currentTopic) return;
    const latestState = queryClient.getQueryData<any>(["interview", bookId]) ?? state;

    const currentIdx = latestState.topics.findIndex((t: any) => t.topic === currentTopic.topic);
    const after = latestState.topics.slice(currentIdx + 1);
    const before = latestState.topics.slice(0, currentIdx);
    const next =
      after.find((t: any) => t.status !== "completed") ??
      before.find((t: any) => t.status !== "completed");

    if (next) {
      await handleTopicSwitch(next.topic);
      toast.success(`Moving on to "${next.topic}"`);
    } else {
      toast.success("Your interview is complete! You can now generate your book manuscript.");
    }
  };

  const handleResumeLater = async () => {
    await flushSaveCurrentStep();
    toast.success("Progress saved! You can resume anytime.");
    router.navigate({ to: "/books/$bookId", params: { bookId } });
  };

  const allTopicsCompleted = !!state && state.completedTopics === state.totalTopics;

  if (isLoading || !state) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary mb-2" />
        Loading interview…
      </div>
    );
  }

  const overallProgress = Math.round((state.completedTopics / state.totalTopics) * 100);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <Link
          to="/books/$bookId"
          params={{ bookId }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to book details
        </Link>
        <Button variant="outline" size="sm" onClick={handleResumeLater}>
          <Bookmark className="mr-1.5 h-4 w-4 text-primary" /> Save & Resume Later
        </Button>
      </div>

      {/* Main Title & Progress Panel */}
      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Interview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We present <strong>3 questions at a time</strong>. Your answers auto-save reliably as you type.
          </p>
        </div>

        {/* Global Progress Card */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>Overall Progress</span>
            <span className="text-primary font-semibold">
              {state.completedTopics} of {state.totalTopics} topics completed ({overallProgress}%)
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> ~{estimatedMinutesLeft} mins left
            </span>
            <span>{state.totalAnswered} answered</span>
          </div>
        </div>
      </div>

      {allTopicsCompleted && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-7 w-7 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-base text-foreground">Your interview is complete! 🎉</h3>
              <p className="text-sm text-muted-foreground">
                All required answers are saved. You are ready to generate your family history manuscript.
              </p>
            </div>
          </div>
          <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Link to="/books/$bookId/manuscript" params={{ bookId }}>
              Continue to Book Generation <ChevronRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      {/* Main Layout: Topic Sidebar + 3-Question Interview Container */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar Topics List */}
        <aside className="rounded-2xl border border-border/60 bg-card p-3 h-fit space-y-1">
          <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Interview Topics
          </h2>
          <ul className="space-y-1">
            {state.topics.map((t) => {
              const active = t.topic === activeTopic;
              const done = t.status === "completed";
              const inProgress = t.status === "in_progress";
              return (
                <li key={t.topic}>
                  <button
                    onClick={() => handleTopicSwitch(t.topic)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                      active
                        ? "bg-primary/10 text-primary font-semibold shadow-xs"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : inProgress ? (
                        <span className="h-4 w-4 shrink-0 flex items-center justify-center">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        </span>
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                      )}
                      <span className="truncate">{t.topic}</span>
                    </div>

                    <span className="text-xs font-medium shrink-0">
                      {done ? (
                        <span className="text-emerald-600 font-semibold">✓ Completed</span>
                      ) : inProgress ? (
                        <span className="text-amber-600 font-normal">● In Progress</span>
                      ) : (
                        <span className="text-muted-foreground/60 font-normal">○ Not Started</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* 3-Questions Section */}
        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-6">
          {!currentTopic ? (
            <p className="text-muted-foreground">Select a topic to begin.</p>
          ) : (
            <>
              {/* Header inside Panel */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight">{currentTopic.topic}</h2>
                    {currentTopic.status === "completed" && <Badge className="bg-emerald-600 text-white">✓ Completed</Badge>}
                    {currentTopic.status === "in_progress" && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">● In Progress</Badge>
                    )}
                    {currentTopic.status === "not_started" && (
                      <Badge variant="outline" className="text-muted-foreground">○ Not Started</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      Step <strong>{currentStep + 1}</strong> of <strong>{totalStepsInTopic}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Questions {currentStep * questionsPerStep + 1}–
                      {Math.min(
                        (currentStep + 1) * questionsPerStep,
                        currentTopic.qa.length,
                      )}{" "}
                      of {currentTopic.qa.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <SaveStatusIndicator status={savingStatus} lastSavedTime={lastSavedTime} />
                  <button
                    onClick={() => setPaused((p) => !p)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
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
              </div>

              {/* Validation Warning Alert */}
              {validationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Notice</AlertTitle>
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              {paused ? (
                <div className="rounded-xl bg-muted/40 p-8 text-center space-y-3">
                  <PauseCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Interview Paused</h3>
                  <p className="text-sm text-muted-foreground">
                    Your answers are saved. Resume whenever you are ready.
                  </p>
                  <Button onClick={() => setPaused(false)}>
                    <PlayCircle className="mr-2 h-4 w-4" /> Resume Interview
                  </Button>
                </div>
              ) : currentTopic.qa.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-3">
                  <Sparkles className="mx-auto h-10 w-10 text-primary" />
                  <h3 className="font-semibold text-lg">Begin Topic: "{currentTopic.topic}"</h3>
                  <p className="text-sm text-muted-foreground">
                    We will generate tailored interview questions {questionsPerStep} at a time.
                  </p>
                  <Button
                    onClick={() => generateMutation.mutate(currentTopic.topic)}
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Questions…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" /> Start Topic
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  {/* DISPLAY DYNAMIC BATCH OF QUESTIONS AT A TIME */}
                  <div className="space-y-6">
                    {currentStepQas.map((qa, indexOnStep) => {
                      const absoluteIndex = currentStep * questionsPerStep + indexOnStep + 1;
                      const isListeningThis = speech.listening && activeSpeechQaId === qa.id;
                      const val = drafts[qa.id] ?? "";
                      const isMissing = !val || val.trim().length === 0;

                      return (
                        <div
                          key={qa.id}
                          className={`rounded-2xl border p-5 transition-all space-y-3 ${
                            validationError && isMissing
                              ? "border-destructive/80 bg-destructive/5 shadow-xs"
                              : "border-border/60 bg-muted/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                Q{absoluteIndex}
                              </span>
                              <p className="text-base font-medium leading-relaxed">{qa.question}</p>
                            </div>

                            {speech.supported && (
                              <Button
                                type="button"
                                size="sm"
                                variant={isListeningThis ? "default" : "outline"}
                                onClick={() => {
                                  if (isListeningThis) {
                                    speech.stop();
                                    setActiveSpeechQaId(null);
                                  } else {
                                    setActiveSpeechQaId(qa.id);
                                    speech.start();
                                  }
                                }}
                                className={isListeningThis ? "animate-pulse" : ""}
                              >
                                {isListeningThis ? (
                                  <>
                                    <MicOff className="mr-1 h-3.5 w-3.5" /> Stop
                                  </>
                                ) : (
                                  <>
                                    <Mic className="mr-1 h-3.5 w-3.5" /> Speak
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          <div className="relative">
                            <Textarea
                              value={val}
                              onChange={(e) => handleTextareaChange(qa.id, e.target.value)}
                              onBlur={() => flushSaveCurrentStep()}
                              placeholder={`Answer Question ${absoluteIndex} in as much detail as you'd like…`}
                              rows={4}
                              className={validationError && isMissing ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                            {isListeningThis && (
                              <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                                Listening…
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Navigation Controls - No Manual Mark as Complete Button */}
                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-4">
                    <Button
                      onClick={handleNextStep}
                      disabled={generateMutation.isPending || topicStatusMutation.isPending}
                    >
                      {generateMutation.isPending || topicStatusMutation.isPending ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving & Processing…
                        </>
                      ) : currentStep < totalStepsInTopic - 1 ? (
                        <>
                          Next Questions <ChevronRight className="ml-1 h-4 w-4" />
                        </>
                      ) : isFinalTopic ? (
                        <>
                          Finish Interview <CheckCircle2 className="ml-1 h-4 w-4 text-emerald-500" />
                        </>
                      ) : (
                        <>
                          Next Topic <ChevronRight className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function SaveStatusIndicator({
  status,
  lastSavedTime,
}: {
  status: SaveStatus;
  lastSavedTime: string | null;
}) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Saving…
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
        <Check className="h-3.5 w-3.5 text-emerald-600" />
        Saved ✓ {lastSavedTime ? `(Last Saved: ${lastSavedTime})` : ""}
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-destructive font-medium">
        <AlertCircle className="h-3.5 w-3.5 text-destructive animate-pulse" />
        Failed to Save (Retrying…)
      </span>
    );
  }

  return null;
}
