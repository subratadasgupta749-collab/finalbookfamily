import { useCallback, useEffect, useRef, useState } from "react";

// Minimal Web Speech API types (not in lib.dom for all TS targets)
type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResult = {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
  length: number;
};
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: SpeechRecognitionResult;
  };
};
type SpeechRecognitionErrorEvent = { error: string; message?: string };

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechToTextOptions {
  lang?: string;
  onAppend: (finalText: string) => void;
  onInterim?: (interimText: string) => void;
}

export function useSpeechToText({
  lang = "en-US",
  onAppend,
  onInterim,
}: UseSpeechToTextOptions) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onAppendRef = useRef(onAppend);
  const onInterimRef = useRef(onInterim);

  useEffect(() => {
    onAppendRef.current = onAppend;
    onInterimRef.current = onInterim;
  }, [onAppend, onInterim]);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Speech recognition not supported in this browser.");
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finalChunk = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        if (r.isFinal) finalChunk += text;
        else interim += text;
      }
      if (finalChunk) onAppendRef.current(finalChunk);
      if (interim && onInterimRef.current) onInterimRef.current(interim);
    };
    rec.onerror = (e) => {
      setError(e.error || "Speech error");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setListening(false);
    }
  }, [lang]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.stop(); } catch { /* ignore */ }
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) { try { rec.abort(); } catch { /* ignore */ } }
    };
  }, []);

  return { listening, supported, error, start, stop, toggle };
}
