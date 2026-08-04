import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Clock,
  BookOpen,
  Download,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  Feather,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";

export type BookGenerationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => Promise<any>;
  bookId: string;
  bookName?: string;
  theme?: string;
  onViewBook?: () => void;
  onDownloadPdf?: () => void;
};

const DEFAULT_STAGES = [
  "Preparing your interview responses...",
  "Organizing your family memories...",
  "Writing beautiful chapters with AI...",
  "Improving grammar and readability...",
  "Creating your book structure...",
  "Designing your selected theme...",
  "Optimizing photos...",
  "Building PDF preview...",
  "Final quality checks...",
  "🎉 Your Family History Book is almost ready!",
];

const DEFAULT_MESSAGES = [
  "Collecting your memories...",
  "Writing your life story...",
  "Creating beautiful chapters...",
  "Choosing the perfect layout...",
  "Preparing your keepsake book...",
  "Adding finishing touches...",
  "Almost there...",
];

export function BookGenerationModal({
  isOpen,
  onClose,
  onGenerate,
  bookId,
  bookName = "Family History Book",
  theme = "classic",
  onViewBook,
  onDownloadPdf,
}: BookGenerationModalProps) {
  const router = useRouter();
  const settings = useSettings();
  const bgConfig = settings?.book_generation;

  // Configuration values (falling back gracefully to defaults)
  const isEnabled = bgConfig?.enabled ?? true;
  const estTimeSeconds = bgConfig?.est_time_seconds ?? 45;
  const stages = useMemo(() => {
    return bgConfig?.stages && bgConfig.stages.length > 0
      ? bgConfig.stages
      : DEFAULT_STAGES;
  }, [bgConfig?.stages]);

  const messages = useMemo(() => {
    return bgConfig?.progress_messages && bgConfig.progress_messages.length > 0
      ? bgConfig.progress_messages
      : DEFAULT_MESSAGES;
  }, [bgConfig?.progress_messages]);

  const speedFactor = useMemo(() => {
    const sp = bgConfig?.animation_speed;
    if (sp === "fast") return 0.7;
    if (sp === "slow") return 1.4;
    return 1.0;
  }, [bgConfig?.animation_speed]);

  const successMessage =
    bgConfig?.success_message || "Your book has been created successfully!";
  const errorMessageText =
    bgConfig?.error_message ||
    "We couldn't finish generating your book right now. Please try again.";

  // State
  const [status, setStatus] = useState<"idle" | "generating" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(estTimeSeconds);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const isGeneratingRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Trigger generation flow when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setStatus("idle");
      setProgress(0);
      setCurrentMessageIndex(0);
      setTimeLeft(estTimeSeconds);
      setErrorDetails(null);
      isGeneratingRef.current = false;
      return;
    }

    startGenerationFlow();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (messageTimerRef.current) clearInterval(messageTimerRef.current);
    };
  }, [isOpen]);

  const startGenerationFlow = async () => {
    setStatus("generating");
    setProgress(0);
    setTimeLeft(estTimeSeconds);
    setErrorDetails(null);
    isGeneratingRef.current = true;
    startTimeRef.current = Date.now();

    // 1. Rotating messages interval (3.5s * speedFactor)
    if (messageTimerRef.current) clearInterval(messageTimerRef.current);
    const msgIntervalMs = Math.round(3500 * speedFactor);
    messageTimerRef.current = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, msgIntervalMs);

    // 2. Micro-tick smooth progress animation frame loop
    const targetDurationMs = estTimeSeconds * 1000 * speedFactor;

    const tick = () => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;

      if (isGeneratingRef.current) {
        // While generating, smoothly ramp progress up to 95%
        const simulatedRatio = Math.min(0.95, elapsed / targetDurationMs);
        // Easing curve: ease-out quadratic for natural movement
        const eased = 1 - Math.pow(1 - simulatedRatio, 2);
        const currentProg = Math.min(95, Math.max(1, Math.floor(eased * 95)));

        setProgress(currentProg);

        // Update estimated time left
        const secondsElapsed = Math.floor(elapsed / 1000);
        const remaining = Math.max(1, estTimeSeconds - secondsElapsed);
        setTimeLeft(remaining);

        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    // 3. Execute the actual generation server function
    try {
      await onGenerate();

      // Generation succeeded!
      isGeneratingRef.current = false;

      // Animate remaining progress smoothly from current progress to 100%
      let finishProg = progress;
      const finishInterval = setInterval(() => {
        finishProg += 2;
        if (finishProg >= 100) {
          finishProg = 100;
          clearInterval(finishInterval);
          setProgress(100);
          setTimeLeft(0);
          setStatus("success");
        } else {
          setProgress(finishProg);
        }
      }, 30);
    } catch (err: any) {
      isGeneratingRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (messageTimerRef.current) clearInterval(messageTimerRef.current);

      setStatus("error");
      setErrorDetails(err?.message || "An unexpected error occurred during generation.");
    }
  };

  if (!isOpen) return null;

  // Calculate active stage index based on progress percentage
  const currentStageIndex = Math.min(
    stages.length - 1,
    Math.floor((progress / 100) * stages.length)
  );

  const handleViewBookClick = () => {
    if (onViewBook) {
      onViewBook();
    } else {
      router.navigate({ to: "/books/$bookId/manuscript", params: { bookId } });
    }
    onClose();
  };

  const handleDownloadPdfClick = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
    } else {
      router.navigate({ to: "/books/$bookId/preview", params: { bookId } });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-background/80 backdrop-blur-2xl pointer-events-auto overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Background radial glowing spots */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Modal Card */}
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-primary/20 bg-card/95 p-6 md:p-8 shadow-2xl backdrop-blur-md transition-all">
        
        {/* ================= SUCCESS STATE VIEW ================= */}
        {status === "success" && (
          <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-500">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500/20 via-emerald-500/10 to-primary/20 border border-emerald-500/30 shadow-lg">
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-amber-400 animate-bounce" />
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold font-serif tracking-tight text-foreground">
                🎉 {successMessage}
              </h2>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                Your answers have been beautifully crafted into manuscript chapters, complete with timelines, pull-quotes, and photo layouts for <strong className="text-foreground">{bookName}</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <Button onClick={handleViewBookClick} size="lg" className="rounded-xl px-6 shadow-md">
                <BookOpen className="mr-2 h-4 w-4" /> View Book
              </Button>
              <Button onClick={handleDownloadPdfClick} variant="outline" size="lg" className="rounded-xl px-6">
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
              <Button onClick={onClose} variant="ghost" size="lg" className="rounded-xl">
                <RotateCcw className="mr-2 h-4 w-4" /> Create Another Book
              </Button>
            </div>
          </div>
        )}

        {/* ================= ERROR STATE VIEW ================= */}
        {status === "error" && (
          <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-destructive/10 border border-destructive/30 text-destructive shadow-md">
              <AlertCircle className="h-10 w-10" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Generation Encountered an Issue
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {errorMessageText}
              </p>
              {errorDetails && (
                <div className="mt-2 p-3 rounded-lg bg-muted/60 text-xs text-muted-foreground text-left font-mono overflow-x-auto max-h-24">
                  {errorDetails}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button onClick={startGenerationFlow} size="lg" className="rounded-xl">
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
              <Button
                onClick={() => router.navigate({ to: "/help" })}
                variant="outline"
                size="lg"
                className="rounded-xl"
              >
                <HelpCircle className="mr-2 h-4 w-4" /> Contact Support
              </Button>
              <Button onClick={onClose} variant="ghost" size="lg" className="rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ================= GENERATING / LOADING STATE VIEW ================= */}
        {(status === "generating" || status === "idle") && (
          <div className="space-y-6">
            {/* Top Modal Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border/50 pb-5">
              <div className="flex items-center gap-3 text-center md:text-left">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <Sparkles className="h-5 w-5 animate-spin-slow text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-serif tracking-tight text-foreground">
                    Generating "{bookName}"
                  </h2>
                  <p className="text-xs md:text-sm text-primary font-medium transition-all duration-500 ease-in-out">
                    ✨ {messages[currentMessageIndex]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs text-primary font-medium shadow-xs">
                <Clock className="h-3.5 w-3.5 animate-pulse text-amber-500" />
                <span>Est. time remaining: ~{timeLeft}s</span>
              </div>
            </div>

            {/* Main Interactive Stage Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Left Column: 3D Animated Book & Floating Photos Preview */}
              <div className="md:col-span-6 relative flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-muted/40 to-muted/20 border border-border/40 overflow-hidden min-h-[280px]">
                
                {/* Floating Polaroid Photos (Drifting physics) */}
                <div className="absolute top-3 left-3 w-16 h-20 bg-white p-1 rounded-md shadow-md border border-border/50 animate-float opacity-80 z-10 hidden sm:block">
                  <div className="w-full h-12 bg-amber-100/60 rounded-xs flex items-center justify-center text-[10px] text-amber-800/60 font-serif">
                    Memory
                  </div>
                  <div className="mt-1 text-[8px] text-center text-muted-foreground font-mono">1984</div>
                </div>

                <div className="absolute bottom-4 right-3 w-20 h-24 bg-white p-1.5 rounded-md shadow-md border border-border/50 animate-float-alt opacity-80 z-10 hidden sm:block">
                  <div className="w-full h-15 bg-primary/10 rounded-xs flex items-center justify-center text-[10px] text-primary/70 font-serif">
                    Photo
                  </div>
                  <div className="mt-1 text-[8px] text-center text-muted-foreground font-mono">Family</div>
                </div>

                {/* 3D Animated Book Container */}
                <div className="relative w-48 h-64 rounded-r-xl rounded-l-xs bg-gradient-to-r from-primary/90 via-primary to-primary/90 shadow-2xl border-l-4 border-amber-900/60 flex flex-col justify-between p-4 text-primary-foreground transform hover:scale-105 transition-transform duration-500">
                  {/* Book Spine Shadow */}
                  <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/20 shadow-inner" />

                  {/* Book Cover Header */}
                  <div className="text-center pt-2 space-y-1 relative z-10">
                    <div className="text-[9px] uppercase tracking-widest text-amber-200/80 font-mono">
                      {theme.replace(/_/g, " ")} Edition
                    </div>
                    <h3 className="text-base font-serif font-bold leading-tight text-white line-clamp-2 px-1">
                      {bookName}
                    </h3>
                  </div>

                  {/* Turning Book Page (Animated Flip) */}
                  <div className="relative my-auto w-full h-28 bg-amber-50/95 dark:bg-zinc-900/95 rounded-r-md p-3 text-foreground shadow-md border-l border-amber-900/20 overflow-hidden">
                    {/* Animated Page Flip overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-100/80 to-white/90 dark:from-zinc-800 dark:to-zinc-900 animate-page-turn origin-left" />

                    {/* Skeleton Text Lines inside Book Page */}
                    <div className="space-y-2 relative z-0 opacity-80">
                      <div className="h-2 w-3/4 bg-primary/20 rounded-full animate-pulse" />
                      <div className="h-2 w-full bg-muted-foreground/20 rounded-full" />
                      <div className="h-2 w-5/6 bg-muted-foreground/20 rounded-full" />
                      <div className="h-2 w-2/3 bg-muted-foreground/20 rounded-full" />
                    </div>

                    {/* Writing Fountain Pen Animated Effect */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 animate-pen-glide text-primary z-20">
                      <Feather className="h-4 w-4 animate-bounce text-amber-600" />
                      <span className="h-0.5 w-8 bg-amber-500/60 rounded-full" />
                    </div>
                  </div>

                  {/* Book Cover Footer */}
                  <div className="text-center pb-1 text-[10px] text-amber-200/90 font-serif">
                    Keepsake Edition
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <PenTool className="h-3.5 w-3.5 text-primary animate-pulse" />
                  <span>AI biographers writing narrative & formatting layouts…</span>
                </div>
              </div>

              {/* Right Column: Realistic Generation Stages Checklist */}
              <div className="md:col-span-6 space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
                  <span>Generation Pipeline</span>
                  <span className="text-primary font-mono">{progress}% Complete</span>
                </h4>

                {stages.map((stage, idx) => {
                  const isDone = idx < currentStageIndex || progress === 100;
                  const isActive = idx === currentStageIndex && progress < 100;
                  const isPending = idx > currentStageIndex && progress < 100;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs md:text-sm transition-all duration-300 ${
                        isDone
                          ? "border-emerald-500/30 bg-emerald-500/5 text-foreground font-medium"
                          : isActive
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary/30"
                          : "border-border/40 bg-muted/20 text-muted-foreground opacity-60"
                      }`}
                    >
                      <div className="shrink-0">
                        {isDone ? (
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-xs">
                            ✓
                          </span>
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-border/80" />
                        )}
                      </div>
                      <span className="flex-1 leading-snug">{stage}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Section: Continuous Smooth Progress Bar */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Writing Progress</span>
                <span className="text-primary font-mono text-sm font-bold">{progress}%</span>
              </div>

              {/* Progress Track */}
              <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-muted/60 p-0.5 shadow-inner">
                {/* Radiant Fill */}
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-amber-500 to-emerald-500 transition-all duration-200 ease-out relative overflow-hidden shadow-sm"
                  style={{ width: `${progress}%` }}
                >
                  {/* Shimmer Light Beam */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
