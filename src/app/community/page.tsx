"use client";

import Link from "next/link";
import io from "socket.io-client";
import { useEffect, useRef, useState } from "react";

import Camera from "../components/Camera";
import Visualization from "../components/Visualization";

let socket: ReturnType<typeof io> | null = null;
function getSocket() {
  if (!socket) socket = io(process.env.NEXT_PUBLIC_SERVER_URL || "ws://localhost:1234");
  return socket;
}

export default function CommunityCapture() {
  const [connected, setConnected] = useState(false);
  const [capturePhrase, setCapturePhrase] = useState("");
  const [captureState, setCaptureState] = useState<"idle" | "countdown" | "capturing" | "preview_ready" | "saved" | "error">("idle");
  const [captureMessage, setCaptureMessage] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [scheduledPhrase, setScheduledPhrase] = useState<string | null>(null);
  const [phraseExists, setPhraseExists] = useState(false);
  const [blockedWords, setBlockedWords] = useState<string[]>([]);
  const [nonEnglishWords, setNonEnglishWords] = useState<string[]>([]);
  const [phraseCheckState, setPhraseCheckState] = useState<"idle" | "checking" | "ready">("idle");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewQueue = useRef<any[]>([]);
  const previewCurrentWordRef = useRef<string>("");
  const [previewCurrentWord, setPreviewCurrentWord] = useState("");
  const [previewAvailable, setPreviewAvailable] = useState(false);
  const livePreviewFrames = useRef<any[] | null>(null);
  const livePreviewLabel = useRef("");
  const lastPreviewFrames = useRef<any[] | null>(null);
  const lastPreviewLabel = useRef("");
  const normalizedPhraseRef = useRef("");
  const phraseCheckCacheRef = useRef(new Map<string, { exists: boolean; blockedWords: string[]; nonEnglishWords: string[] }>());
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const s = getSocket();

    function onConnect() { setConnected(true); }
    function onDisconnect() { setConnected(false); }
    function onCaptureStatus(data: { state?: "idle" | "capturing" | "preview_ready" | "saved" | "error"; message?: string }) {
      setCaptureState(data?.state || "idle");
      setCaptureMessage(data?.message || "");
    }
    function onCaptureSaved(data: { phrase?: string; frameCount?: number }) {
      setCaptureState("saved");
      if (data?.phrase && typeof data.frameCount === "number") {
        setCaptureMessage(`Saved "${data.phrase}" with ${data.frameCount} frames.`);
      }
      setPreviewId(null);
      setPreviewAvailable(false);
      livePreviewFrames.current = null;
      livePreviewLabel.current = "";
      previewQueue.current = [];
      previewCurrentWordRef.current = "";
      setPreviewCurrentWord("");
    }
    function onCapturePreview(data: { previewId?: string; phrase?: string; points?: any[]; frameCount?: number }) {
      if (!data?.previewId || !Array.isArray(data.points) || !data.phrase) return;
      livePreviewFrames.current = null;
      livePreviewLabel.current = "";
      setPreviewId(data.previewId);
      const label = `preview-${data.phrase}`;
      previewQueue.current = [[label, data.points]];
      previewCurrentWordRef.current = label;
      setPreviewCurrentWord(label);
      lastPreviewFrames.current = data.points;
      lastPreviewLabel.current = label;
      setPreviewAvailable(true);
      setCaptureState("preview_ready");
      const count = typeof data.frameCount === "number" ? data.frameCount : data.points.length;
      setCaptureMessage(`Preview ready (${count} frames). Save or discard.`);
    }
    function onCaptureLiveFrame(data: { point?: any; phrase?: string }) {
      if (!data?.point || !livePreviewFrames.current) return;
      livePreviewFrames.current.push(data.point);
      if (!previewCurrentWordRef.current && livePreviewLabel.current) {
        previewCurrentWordRef.current = livePreviewLabel.current;
        setPreviewCurrentWord(livePreviewLabel.current);
      }
    }
    function onAnimation(animations: any[]) {
      if (!Array.isArray(animations) || !animations.length) return;
      previewQueue.current = animations;
      const firstLabel = typeof animations[0]?.[0] === "string" ? animations[0][0] : "";
      previewCurrentWordRef.current = firstLabel;
      setPreviewCurrentWord(firstLabel);
      setPreviewAvailable(true);
      setCaptureMessage(`Loaded ${animations.length} sign ${animations.length === 1 ? "animation" : "animations"} for preview.`);
    }
    function onPhraseCheckResult(data: { phrase?: string; exists?: boolean; blockedWords?: string[]; nonEnglishWords?: string[]; error?: boolean }) {
      const normalizedInput = normalizedPhraseRef.current;
      const checked = (data?.phrase || "").trim().toLowerCase();
      if (!normalizedInput || checked !== normalizedInput) return;
      const nextValue = {
        exists: Boolean(data?.exists),
        blockedWords: Array.isArray(data?.blockedWords) ? data.blockedWords : [],
        nonEnglishWords: Array.isArray(data?.nonEnglishWords) ? data.nonEnglishWords : [],
      };
      const hasRestriction =
        nextValue.exists || nextValue.blockedWords.length > 0 || nextValue.nonEnglishWords.length > 0;
      if (!data?.error && hasRestriction) {
        phraseCheckCacheRef.current.set(checked, nextValue);
      }
      setPhraseExists(nextValue.exists);
      setBlockedWords(nextValue.blockedWords);
      setNonEnglishWords(nextValue.nonEnglishWords);
      setPhraseCheckState("ready");
    }

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("P-CAPTURE-STATUS", onCaptureStatus);
    s.on("P-CAPTURE-SAVED", onCaptureSaved);
    s.on("P-CAPTURE-PREVIEW", onCapturePreview);
    s.on("P-CAPTURE-LIVE-FRAME", onCaptureLiveFrame);
    s.on("E-ANIMATION", onAnimation);
    s.on("P-PHRASE-CHECK-RESULT", onPhraseCheckResult);

    if (s.connected) setConnected(true);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("P-CAPTURE-STATUS", onCaptureStatus);
      s.off("P-CAPTURE-SAVED", onCaptureSaved);
      s.off("P-CAPTURE-PREVIEW", onCapturePreview);
      s.off("P-CAPTURE-LIVE-FRAME", onCaptureLiveFrame);
      s.off("E-ANIMATION", onAnimation);
      s.off("P-PHRASE-CHECK-RESULT", onPhraseCheckResult);
    };
  }, []);

  useEffect(() => {
    const phrase = capturePhrase.trim().toLowerCase();
    normalizedPhraseRef.current = phrase;
    if (!phrase) {
      setPhraseExists(false);
      setBlockedWords([]);
      setNonEnglishWords([]);
      setPhraseCheckState("idle");
      return;
    }
    const cached = phraseCheckCacheRef.current.get(phrase);
    if (cached) {
      setPhraseExists(cached.exists);
      setBlockedWords(cached.blockedWords);
      setNonEnglishWords(cached.nonEnglishWords);
      setPhraseCheckState("ready");
      return;
    }
    setPhraseExists(false);
    setBlockedWords([]);
    setNonEnglishWords([]);
    setPhraseCheckState("checking");
    const timer = setTimeout(() => {
      getSocket().emit("P-CHECK-PHRASE", { phrase });
    }, 120);
    return () => clearTimeout(timer);
  }, [capturePhrase]);

  useEffect(() => {
    const id = setInterval(() => {
      if (previewCurrentWordRef.current !== previewCurrentWord) {
        setPreviewCurrentWord(previewCurrentWordRef.current);
      }
    }, 100);
    return () => clearInterval(id);
  });

  useEffect(() => {
    if (countdown == null) return;

    if (countdown <= 0) {
      const phrase = scheduledPhrase?.trim();
      if (phrase) {
        setCaptureState("capturing");
        setCaptureMessage("Capturing in progress...");
        getSocket().emit("P-START-CAPTURE", { phrase });
      }
      setCountdown(null);
      setScheduledPhrase(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev == null ? null : prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, scheduledPhrase]);

  useEffect(() => {
    return () => {
      if (!audioContextRef.current) return;
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (countdown == null) return;
    playCountdownTone(countdown);
  }, [countdown]);

  function getAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }
    return audioContextRef.current;
  }

  function playTone(frequency: number, durationMs: number, gainLevel = 0.08) {
    const context = getAudioContext();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(gainLevel, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000);
  }

  function playCountdownTone(value: number) {
    if (value <= 0) {
      playTone(1120, 140, 0.1);
      setTimeout(() => playTone(1480, 180, 0.1), 120);
      return;
    }
    playTone(820, 120, 0.08);
  }

  function startCapture() {
    const phrase = capturePhrase.trim();
    if (!phrase || captureState === "capturing" || countdown != null || phraseExists || blockedWords.length > 0 || nonEnglishWords.length > 0 || phraseCheckState !== "ready") return;
    getAudioContext().resume().catch(() => {});
    const label = `live-${phrase}-${Date.now()}`;
    livePreviewLabel.current = label;
    livePreviewFrames.current = [];
    previewQueue.current = [[label, livePreviewFrames.current]];
    previewCurrentWordRef.current = label;
    setPreviewCurrentWord(label);
    setPreviewAvailable(true);
    setCaptureState("countdown");
    setScheduledPhrase(phrase);
    setCountdown(3);
    setCaptureMessage(`Starting capture in 3...`);
  }

  function demoAccountedPhrase() {
    const phrase = capturePhrase.trim().toLowerCase();
    if (!phrase || phraseCheckState !== "ready" || !phraseExists) return;
    getSocket().emit("E-REQUEST-ANIMATION", phrase);
  }

  function getNextPreviewWord(): string | null {
    if (!previewQueue.current.length) return null;
    const animation = previewQueue.current.shift();
    previewCurrentWordRef.current = animation[0];
    return animation[1];
  }

  function savePreview() {
    if (!previewId) return;
    getSocket().emit("P-CONFIRM-SAVE", { previewId });
  }

  function replayPreview() {
    if (!lastPreviewFrames.current?.length || !lastPreviewLabel.current) return;
    const label = `${lastPreviewLabel.current}-${Date.now()}`;
    const frames = JSON.parse(JSON.stringify(lastPreviewFrames.current));
    previewQueue.current = [[label, frames]];
    previewCurrentWordRef.current = label;
    setPreviewCurrentWord(label);
    setPreviewAvailable(true);
    setCaptureMessage("Replaying captured preview...");
  }

  function discardPreview() {
    if (!previewId) return;
    getSocket().emit("P-DISCARD-PREVIEW", { previewId });
    setPreviewId(null);
    setPreviewAvailable(false);
    livePreviewFrames.current = null;
    livePreviewLabel.current = "";
    lastPreviewFrames.current = null;
    lastPreviewLabel.current = "";
    previewQueue.current = [];
    previewCurrentWordRef.current = "";
    setPreviewCurrentWord("");
    setCountdown(null);
    setScheduledPhrase(null);
  }

  const phraseAlreadyAccountedFor =
    phraseCheckState === "ready" && (phraseExists || blockedWords.length > 0);

  return (
    <div className="w-full h-full flex flex-col bg-neutral-950">
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v-9m0 9 3-3m-3 3-3-3m9.75 5.25h-13.5a2.25 2.25 0 0 1-2.25-2.25V6.75A2.25 2.25 0 0 1 4.5 4.5h15a2.25 2.25 0 0 1 2.25 2.25v9.75a2.25 2.25 0 0 1-2.25 2.25Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-neutral-100">Community Capture</h1>
              <p className="text-[11px] text-neutral-500">Save 3-second phrase samples for training data</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? "bg-neutral-300" : "bg-neutral-600"}`} />
          <span className="text-xs text-neutral-400">{connected ? "Connected" : "Disconnected"}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 p-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-neutral-800 bg-neutral-900/50">
          <div className="flex-1 min-h-[360px] grid grid-cols-1 lg:grid-cols-3">
            <div className="relative border-b border-neutral-800 lg:col-span-2 lg:border-b-0 lg:border-r">
              <Camera mode="community" />
              {countdown != null && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-neutral-950/30 backdrop-blur-[2px]">
                  <div className="rounded border border-neutral-100/40 bg-black/60 px-8 py-5 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-300">Capture starts in</p>
                    <p className="font-mono text-6xl font-semibold leading-none text-white">
                      {countdown > 0 ? countdown : "GO"}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="relative min-h-[280px] lg:min-h-0">
              <Visualization
                signingSpeed={45}
                getNextWord={getNextPreviewWord}
                currentWord={previewCurrentWord}
              />
              {!previewAvailable && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="rounded border border-neutral-700 bg-neutral-950/80 px-3 py-1.5 text-xs text-neutral-500">
                    Avatar preview appears here after capture.
                  </p>
                </div>
              )}
            </div>

          </div>

          <div className="h-[68px] border-t border-white/[0.06] px-5 py-3">
            <div className="h-full overflow-y-auto">
            {!capturePhrase.trim() ? (
              <p className="text-sm italic text-neutral-600">
                Enter a phrase to check if words are already accounted for.
              </p>
            ) : phraseCheckState === "checking" ? (
              <p className="text-sm text-neutral-400">
                Checking whether this phrase and words are already accounted for...
              </p>
            ) : phraseCheckState === "ready" && nonEnglishWords.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-neutral-300">These words are not recognized as English:</p>
                <div className="flex flex-wrap gap-1.5">
                  {nonEnglishWords.map((word) => (
                    <span
                      key={word}
                      className="rounded border border-neutral-600 bg-neutral-950 px-2 py-0.5 text-[11px] text-neutral-200"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            ) : phraseCheckState === "ready" && phraseExists ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-neutral-300">
                  This phrase is already accounted for.
                </p>
                <button
                  onClick={demoAccountedPhrase}
                  className="shrink-0 text-xs font-medium text-neutral-300 underline underline-offset-2 transition-colors hover:text-neutral-100"
                >
                  Demo
                </button>
              </div>
            ) : phraseCheckState === "ready" && blockedWords.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-neutral-300">These words are already accounted for:</p>
                <div className="flex flex-wrap gap-1.5">
                  {blockedWords.map((word) => (
                    <span
                      key={word}
                      className="rounded border border-neutral-600 bg-neutral-950 px-2 py-0.5 text-[11px] text-neutral-200"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            ) : phraseCheckState === "ready" ? (
              <p className="text-sm text-neutral-500">
                This phrase is not yet accounted for. Ready to capture.
              </p>
            ) : (
              <p className="text-sm text-neutral-500">
                Checking phrase status...
              </p>
            )}
            </div>
          </div>

          <div className="space-y-3 border-t border-neutral-800 bg-neutral-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={capturePhrase}
                onChange={(e) => setCapturePhrase(e.target.value)}
                placeholder="Phrase to map to this 3s capture..."
                className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
              />
              <button
                onClick={startCapture}
                disabled={
                  captureState === "capturing" ||
                  countdown != null ||
                  !capturePhrase.trim() ||
                  !!previewId ||
                  phraseExists ||
                  blockedWords.length > 0 ||
                  nonEnglishWords.length > 0 ||
                  phraseCheckState !== "ready"
                }
                className={`rounded border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  phraseAlreadyAccountedFor
                    ? "border-neutral-100 bg-neutral-100 text-neutral-900 hover:bg-white"
                    : "border-neutral-700 bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
                }`}
              >
                {countdown != null ? `Starting ${countdown}...` : "Capture 3s"}
              </button>
            </div>
            {previewId && (
              <div className="flex items-center gap-2">
                <button
                  onClick={replayPreview}
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-900"
                >
                  Play Back
                </button>
                <button
                  onClick={savePreview}
                  className="rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-100 transition-colors hover:bg-neutral-700"
                >
                  Save Preview
                </button>
                <button
                  onClick={discardPreview}
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-900"
                >
                  Discard
                </button>
              </div>
            )}
            <p
              className={`text-xs ${
                captureState === "error"
                  ? "text-neutral-300"
                  : captureState === "saved"
                    ? "text-neutral-200"
                    : captureState === "capturing" || captureState === "preview_ready" || captureState === "countdown"
                      ? "text-neutral-300"
                      : "text-neutral-500"
              }`}
            >
              {captureMessage || "Ready to add a phrase sample to the community dataset."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
