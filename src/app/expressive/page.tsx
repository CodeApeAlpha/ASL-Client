"use client";

import React from "react";
import Link from "next/link";
import io from "socket.io-client";
import "regenerator-runtime/runtime";
import { useEffect, useRef, useState, useCallback } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

import { Slider } from "@/ui/components/Slider";
import Checkbox from "@/ui/components/Checkbox";
import Visualization from "../components/Visualization";
import Camera from "../components/Camera";

let socket: ReturnType<typeof io> | null = null;
function getSocket() {
  if (!socket) socket = io(process.env.NEXT_PUBLIC_SERVER_URL || "ws://localhost:1234");
  return socket;
}

type LetterFrame = { letter: string; start: number; end: number };

type SignDetail = {
  gloss: string;
  type: "sign" | "fingerspell";
  dbMatch?: string;
  similarity?: number;
  letters?: string[];
  letterFrames?: LetterFrame[];
  label: string;
  note?: string;
};

type WordMapEntry = {
  word: string;
  status: "signed" | "dropped";
  reason?: string;
  detail?: SignDetail;
  added?: boolean;
};

const CAMERA_WINDOW_DEFAULT_SIZE = 128;
const CAMERA_WINDOW_MIN_SIZE = 96;
const CAMERA_WINDOW_MAX_SIZE = 240;
const CAMERA_WINDOW_MARGIN = 12;

export default function Expressive() {
  const wordAnimationsToPlay = useRef<any>([]);
  const animationStore = useRef<Map<string, any>>(new Map());
  const currentWordRef = useRef<string>("");
  const processedSpeechWordCountRef = useRef(0);
  const avatarViewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const resizeStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startSize: number;
    position: { x: number; y: number };
  } | null>(null);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [wordMap, setWordMap] = useState<WordMapEntry[]>([]);
  const [signedWords, setSignedWords] = useState<string[]>([]);
  const [tappedDropped, setTappedDropped] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordMapEntry | null>(null);
  const {
    transcript,
    resetTranscript,
    listening,
    browserSupportsSpeechRecognition,
    browserSupportsContinuousListening,
    isMicrophoneAvailable,
  } = useSpeechRecognition();
  const [signingSpeed, setSigningSpeed] = useState<number>(50);
  const [connected, setConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const micStream = useRef<MediaStream | null>(null);
  const [textInput, setTextInput] = useState("");
  const [showOrderInfo, setShowOrderInfo] = useState(false);
  const [useAslGloss, setUseAslGloss] = useState(true);
  const [translateAsIs, setTranslateAsIs] = useState(false);
  const [showSignsPanel, setShowSignsPanel] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<{ x: number; y: number } | null>(null);
  const [cameraSize, setCameraSize] = useState(CAMERA_WINDOW_DEFAULT_SIZE);

  const clampCameraPosition = useCallback((x: number, y: number, size: number, rect: DOMRect) => {
    const maxX = Math.max(CAMERA_WINDOW_MARGIN, rect.width - size - CAMERA_WINDOW_MARGIN);
    const maxY = Math.max(CAMERA_WINDOW_MARGIN, rect.height - size - CAMERA_WINDOW_MARGIN);
    return {
      x: Math.min(Math.max(x, CAMERA_WINDOW_MARGIN), maxX),
      y: Math.min(Math.max(y, CAMERA_WINDOW_MARGIN), maxY),
    };
  }, []);

  useEffect(() => {
    const s = getSocket();

    function onConnect() { setConnected(true); }
    function onDisconnect() { setConnected(false); }
    function onAnimation(animations: any[]) {
      wordAnimationsToPlay.current = [
        ...wordAnimationsToPlay.current,
        ...animations,
      ];
      const labels: string[] = [];
      for (const anim of animations) {
        const label = anim[0] as string;
        if (label) {
          labels.push(label);
          animationStore.current.set(label, anim[1]);
        }
      }
      setSignedWords((prev) => [...prev, ...labels]);
    }
    function onWordMap(map: WordMapEntry[]) {
      setWordMap(map);
    }

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("E-ANIMATION", onAnimation);
    s.on("E-WORD-MAP", onWordMap);

    if (s.connected) setConnected(true);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("E-ANIMATION", onAnimation);
      s.off("E-WORD-MAP", onWordMap);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (currentWordRef.current !== currentWord) {
        setCurrentWord(currentWordRef.current);
      }
    }, 100);
    return () => clearInterval(id);
  });

  useEffect(() => {
    setIsListening(listening);
    if (!micEnabled && micStream.current) {
      micStream.current.getTracks().forEach((t) => t.stop());
      micStream.current = null;
    }
  }, [listening, micEnabled]);

  useEffect(() => {
    if (!micEnabled || listening) return;
    // Some browsers stop recognition on silence even after a successful start;
    // restart while the user still has mic mode enabled.
    SpeechRecognition.startListening({
      continuous: browserSupportsContinuousListening,
      interimResults: true,
      language: "en-US",
    });
  }, [micEnabled, listening, browserSupportsContinuousListening]);

  useEffect(() => {
    return () => {
      // Ensure microphone capture fully stops when leaving this page.
      setMicEnabled(false);
      SpeechRecognition.stopListening();
      if (micStream.current) {
        micStream.current.getTracks().forEach((t) => t.stop());
        micStream.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!transcript) return;
    if (translateAsIs) {
      if (transcript.length < processedSpeechWordCountRef.current) {
        processedSpeechWordCountRef.current = transcript.length;
        return;
      }
      if (transcript.length === processedSpeechWordCountRef.current) return;

      const chunk = transcript.slice(processedSpeechWordCountRef.current).trim();
      processedSpeechWordCountRef.current = transcript.length;
      if (!chunk) return;

      getSocket().emit("E-REQUEST-ANIMATION", {
        text: chunk,
        useGloss: false,
        asIs: true,
      });
      return;
    }

    const words = transcript
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.trim().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ""))
      .filter(Boolean);

    if (!words.length) return;

    if (words.length < processedSpeechWordCountRef.current) {
      processedSpeechWordCountRef.current = words.length;
      return;
    }

    if (words.length === processedSpeechWordCountRef.current) return;

    const newWords = words.slice(processedSpeechWordCountRef.current);
    for (const word of newWords) {
      getSocket().emit("E-REQUEST-ANIMATION", {
        text: word,
        useGloss: useAslGloss,
        asIs: false,
      });
    }
    processedSpeechWordCountRef.current = words.length;
  }, [transcript, useAslGloss, translateAsIs]);

  useEffect(() => {
    processedSpeechWordCountRef.current = 0;
    resetTranscript();
  }, [translateAsIs, resetTranscript]);

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const container = avatarViewportRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (dragStateRef.current && e.pointerId === dragStateRef.current.pointerId) {
        const x = e.clientX - rect.left - dragStateRef.current.offsetX;
        const y = e.clientY - rect.top - dragStateRef.current.offsetY;
        setCameraPosition(clampCameraPosition(x, y, cameraSize, rect));
        return;
      }
      if (resizeStateRef.current && e.pointerId === resizeStateRef.current.pointerId) {
        const dx = e.clientX - resizeStateRef.current.startX;
        const dy = e.clientY - resizeStateRef.current.startY;
        const delta = Math.max(dx, dy);
        const maxByWidth = rect.width - resizeStateRef.current.position.x - CAMERA_WINDOW_MARGIN;
        const maxByHeight = rect.height - resizeStateRef.current.position.y - CAMERA_WINDOW_MARGIN;
        const maxSize = Math.min(CAMERA_WINDOW_MAX_SIZE, maxByWidth, maxByHeight);
        const nextSize = Math.min(
          Math.max(resizeStateRef.current.startSize + delta, CAMERA_WINDOW_MIN_SIZE),
          Math.max(CAMERA_WINDOW_MIN_SIZE, maxSize),
        );
        setCameraSize(nextSize);
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (dragStateRef.current && e.pointerId === dragStateRef.current.pointerId) {
        dragStateRef.current = null;
      }
      if (resizeStateRef.current && e.pointerId === resizeStateRef.current.pointerId) {
        resizeStateRef.current = null;
      }
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [cameraSize, clampCameraPosition]);

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!textInput.trim()) return;
    setWordMap([]);
    setSignedWords([]);
    setCurrentWord("");
    currentWordRef.current = "";
    setTappedDropped(null);
    setSelectedWord(null);
    animationStore.current.clear();
    wordAnimationsToPlay.current = [];
    getSocket().emit("E-REQUEST-ANIMATION", {
      text: translateAsIs ? textInput : textInput.toLowerCase(),
      useGloss: translateAsIs ? false : useAslGloss,
      asIs: translateAsIs,
    });
    setTextInput("");
  }

  function getNextWord(): string | null {
    if (!wordAnimationsToPlay.current.length) return null;
    let animation = wordAnimationsToPlay.current.shift();
    currentWordRef.current = animation[0];
    return animation[1];
  }

  function replayWord(label: string) {
    const frames = animationStore.current.get(label);
    if (!frames) return;
    wordAnimationsToPlay.current = [[label, frames]];
    currentWordRef.current = label;
    setCurrentWord(label);
  }

  function replayLetter(label: string, lf: { letter: string; start: number; end: number }) {
    const frames = animationStore.current.get(label);
    if (!frames) return;
    const slice = frames.slice(lf.start, lf.end).map((f: any, i: number) => {
      const copy = JSON.parse(JSON.stringify(f));
      copy[0] = i;
      return copy;
    });
    wordAnimationsToPlay.current = [[label, slice]];
    currentWordRef.current = label;
    setCurrentWord(label);
  }

  const toggleListening = useCallback(async () => {
    if (micEnabled) {
      setMicEnabled(false);
      SpeechRecognition.stopListening();
      processedSpeechWordCountRef.current = 0;
      resetTranscript();
      if (micStream.current) {
        micStream.current.getTracks().forEach((t) => t.stop());
        micStream.current = null;
      }
      return;
    }
    if (!browserSupportsSpeechRecognition) {
      alert("Your browser doesn't support speech recognition. Please use Chrome or Edge, or type in the text field instead.");
      return;
    }
    if (isMicrophoneAvailable === false) {
      alert("Microphone is unavailable. Check browser permissions and system input settings, then try again.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.current = stream;
      processedSpeechWordCountRef.current = 0;
      resetTranscript();
      setMicEnabled(true);
      await SpeechRecognition.startListening({
        continuous: browserSupportsContinuousListening,
        interimResults: true,
        language: "en-US",
      });
    } catch {
      setMicEnabled(false);
      alert("Microphone access was denied. Please allow microphone access in your browser settings and try again.");
    }
  }, [
    micEnabled,
    resetTranscript,
    browserSupportsSpeechRecognition,
    browserSupportsContinuousListening,
    isMicrophoneAvailable,
  ]);

  function handleCameraDragStart(e: React.PointerEvent<HTMLDivElement>) {
    const container = avatarViewportRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const current =
      cameraPosition ??
      clampCameraPosition(
        rect.width - cameraSize - CAMERA_WINDOW_MARGIN,
        rect.height - cameraSize - CAMERA_WINDOW_MARGIN,
        cameraSize,
        rect,
      );
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    dragStateRef.current = {
      pointerId: e.pointerId,
      offsetX: pointerX - current.x,
      offsetY: pointerY - current.y,
    };
    setCameraPosition(current);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handleCameraResizeStart(e: React.PointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const container = avatarViewportRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const current =
      cameraPosition ??
      clampCameraPosition(
        rect.width - cameraSize - CAMERA_WINDOW_MARGIN,
        rect.height - cameraSize - CAMERA_WINDOW_MARGIN,
        cameraSize,
        rect,
      );
    setCameraPosition(current);
    resizeStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startSize: cameraSize,
      position: current,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  return (
    <div className="w-full h-full flex flex-col bg-neutral-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center border border-neutral-700 bg-neutral-950 transition-colors hover:bg-neutral-900"
          >
            <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center border border-neutral-700 bg-neutral-950">
              <svg className="h-4 w-4 text-neutral-300" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-neutral-100">English → ASL</h1>
              <p className="text-[11px] text-neutral-500">Speak or type to see ASL animation</p>
            </div>
            <button
              type="button"
              onClick={() => setShowOrderInfo((prev) => !prev)}
              aria-label="Why word order changes"
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950 text-[11px] font-semibold text-neutral-300 transition-colors hover:bg-neutral-900 hover:text-neutral-100"
              title="Why word order can change"
            >
              i
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? "bg-neutral-300" : "bg-neutral-600"}`} />
          <span className="text-xs text-neutral-400">{connected ? "Connected" : "Disconnected"}</span>
        </div>
      </header>
      {showOrderInfo && (
        <div className="mx-4 mt-3 border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-xs text-neutral-300">
          Word order may look different from English because the app converts text into ASL Gloss before signing.
          ASL grammar can reorder words (for example, topic/object first), so this is expected behavior.
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-0 p-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-neutral-800 bg-neutral-900/50">
          <div ref={avatarViewportRef} className="relative flex-1 min-h-[300px]">
            <Visualization
              signingSpeed={signingSpeed}
              getNextWord={getNextWord}
              currentWord={currentWord}
              letterFrames={
                currentWord.startsWith("fs-")
                  ? wordMap
                      .find((e) => e.detail?.label === currentWord)
                      ?.detail?.letterFrames
                  : undefined
              }
              onLetterClick={(lf) => {
                if (currentWord.startsWith("fs-")) {
                  replayLetter(currentWord, lf);
                }
              }}
            />
            {!currentWord && signedWords.length === 0 && wordMap.length === 0 && !transcript && (
              <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
                <div className="rounded border border-neutral-700/80 bg-neutral-950/80 px-4 py-2 text-center backdrop-blur-sm">
                  <p className="text-xs font-medium text-neutral-200">Avatar preview ready</p>
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Type or use mic to start English → ASL animation.
                  </p>
                </div>
              </div>
            )}
            <div
              onPointerDown={handleCameraDragStart}
              className={`absolute overflow-hidden rounded-lg border border-neutral-700/90 bg-neutral-950 shadow-lg ring-1 ring-neutral-900/70 ${cameraPosition ? "" : "bottom-3 right-3"}`}
              style={{
                width: `${cameraSize}px`,
                height: `${cameraSize}px`,
                ...(cameraPosition ? { left: `${cameraPosition.x}px`, top: `${cameraPosition.y}px` } : {}),
              }}
            >
              <div className="h-full w-full cursor-grab active:cursor-grabbing touch-none select-none">
                <div className="pointer-events-none h-full w-full">
                  <Camera />
                </div>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={toggleListening}
                  aria-label={micEnabled ? "Stop microphone" : "Start microphone"}
                  title={micEnabled ? "Stop microphone" : "Start microphone"}
                  className={`absolute bottom-1 left-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                    micEnabled
                      ? "border-rose-300/70 bg-rose-500/90 text-white shadow-[0_0_14px_rgba(244,63,94,0.45)]"
                      : "border-neutral-700 bg-neutral-950/90 text-neutral-200 hover:bg-neutral-900/95"
                  }`}
                >
                  {micEnabled ? (
                    <>
                      <span className="relative flex h-4 w-4 items-center justify-center">
                        <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-rose-200/70 opacity-80" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                      </span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                      </svg>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onPointerDown={handleCameraResizeStart}
                  aria-label="Resize camera preview"
                  title="Resize camera preview"
                  className="absolute bottom-0 right-0 z-10 h-5 w-5 cursor-se-resize rounded-tl border-l border-t border-neutral-600 bg-neutral-900/90 text-neutral-300"
                >
                  <svg className="h-full w-full p-1" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M6 12h6M9 9h3M12 6h0" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {(wordMap.length > 0 || signedWords.length > 0) && showSignsPanel && (
            <div className="border-t border-neutral-800">
              {/* English input row */}
              {wordMap.length > 0 && (
                <div className="px-5 pt-3 pb-1">
                  <p className="mb-1.5 text-[10px] uppercase tracking-wider text-neutral-500">English</p>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    {wordMap.filter(e => !e.added).map((entry, i) => (
                      <span
                        key={`en-${entry.word}-${i}`}
                        className="cursor-pointer select-none"
                        onClick={() => {
                          setSelectedWord(selectedWord === entry ? null : entry);
                          setTappedDropped(null);
                          if (entry.status === "signed" && entry.detail?.label) {
                            replayWord(entry.detail.label);
                          }
                        }}
                      >
                        <span className={`text-sm font-medium transition-colors ${
                          entry.status === "dropped"
                            ? selectedWord === entry
                              ? "text-neutral-300 line-through decoration-neutral-500"
                              : "text-neutral-500 line-through decoration-neutral-600 hover:text-neutral-400"
                            : selectedWord === entry
                              ? "text-neutral-100 underline underline-offset-4 decoration-neutral-500"
                              : "text-neutral-400 hover:text-neutral-200"
                        }`}>
                          {entry.word}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ASL signing queue */}
              {signedWords.length > 0 && (
                <div className="px-5 pt-2 pb-3">
                  <p className="mb-1.5 text-[10px] uppercase tracking-wider text-neutral-500">ASL Signs</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                    {signedWords.map((label, i) => {
                      const activeIdx = signedWords.indexOf(currentWord);
                      const isActive = i === activeIdx;
                      const isPast = activeIdx >= 0 && i < activeIdx;
                      const isFingerspell = label.startsWith("fs-");
                      const display = isFingerspell ? label.slice(3) : label.toUpperCase();
                      const matchEntry = wordMap.find(
                        (e) => e.detail?.label === label
                      );

                      return (
                        <span
                          key={`asl-${label}-${i}`}
                          className="relative flex flex-col items-center gap-1 cursor-pointer select-none"
                          onClick={() => {
                            setSelectedWord(matchEntry || null);
                            setTappedDropped(null);
                            replayWord(label);
                          }}
                        >
                          <span className={`flex items-center gap-1 text-sm font-semibold tracking-wide transition-colors ${
                            isActive
                              ? "text-neutral-100"
                              : isPast
                                ? "text-neutral-600"
                                : "text-neutral-200 hover:text-neutral-100"
                          }`}>
                            {isFingerspell && (
                              <span className="text-[9px] font-normal uppercase text-neutral-500">fs</span>
                            )}
                            {display}
                          </span>
                          {isActive && (
                            <span className="absolute -bottom-1.5 h-1.5 w-1.5 rounded-full bg-neutral-200" />
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detail panel */}
              {selectedWord && (
                <div className="border-t border-neutral-800 bg-neutral-900 px-5 py-2.5">
                  {selectedWord.status === "dropped" ? (
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[10px] font-bold text-neutral-200">!</span>
                      <div>
                        <p className="text-xs font-medium text-neutral-200">
                          &ldquo;{selectedWord.word}&rdquo; — not signed
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {selectedWord.reason}
                        </p>
                      </div>
                    </div>
                  ) : selectedWord.detail ? (
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[10px] font-bold text-neutral-200">
                        {selectedWord.detail.type === "sign" ? "S" : "F"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-white font-medium">
                          &ldquo;{selectedWord.word}&rdquo; → <span className="text-neutral-200">{selectedWord.detail.gloss}</span>
                          {selectedWord.detail.note && (
                            <span className="text-neutral-500 ml-1.5">({selectedWord.detail.note})</span>
                          )}
                        </p>
                        {selectedWord.detail.type === "sign" ? (
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Matched sign <span className="text-neutral-300">&ldquo;{selectedWord.detail.dbMatch}&rdquo;</span> from database
                            {selectedWord.detail.similarity != null && (
                              <span className="ml-1 text-neutral-300">({selectedWord.detail.similarity}% match)</span>
                            )}
                          </p>
                        ) : (
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            No matching sign found — fingerspelled as{" "}
                            <span className="font-mono tracking-widest text-neutral-300">
                              {selectedWord.detail.letters?.join("-")}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">No detail available</p>
                  )}
                </div>
              )}
            </div>
          )}

          {transcript && (
            <div className="border-t border-neutral-800 px-5 py-2">
              <p className="text-sm text-neutral-500 italic">{transcript}</p>
            </div>
          )}

          <div className="space-y-3 border-t border-neutral-800 bg-neutral-900 px-4 py-3">
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type English here and press Enter..."
                className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
              />
              <button
                type="submit"
                className="rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-100 transition-colors hover:bg-neutral-700"
              >
                Translate
              </button>
            </form>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSignsPanel((prev) => !prev)}
                  className={`rounded border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    showSignsPanel
                      ? "border-neutral-600 bg-neutral-800 text-neutral-100"
                      : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:bg-neutral-900"
                  }`}
                >
                  {showSignsPanel ? "Hide ASL Signs" : "Show ASL Signs"}
                </button>
                <Checkbox
                  label="ASL Gloss"
                  checked={useAslGloss}
                  onChange={setUseAslGloss}
                />
                <button
                  type="button"
                  onClick={() => setTranslateAsIs((prev) => !prev)}
                  className={`rounded border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    translateAsIs
                      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                      : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:bg-neutral-900"
                  }`}
                  title="Bypass cleanup and gloss conversion"
                >
                  {translateAsIs ? "As-Is ON" : "As-Is OFF"}
                </button>
              </div>

              <div className="flex items-center gap-2 w-40">
                <span className="text-[10px] text-neutral-500 whitespace-nowrap">{signingSpeed}%</span>
                <Slider
                  defaultValue={[signingSpeed]}
                  value={[signingSpeed]}
                  onValueChange={(value) => setSigningSpeed(value[0])}
                  min={20}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
