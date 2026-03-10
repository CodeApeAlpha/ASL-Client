"use client";

import { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import Avatar from "./Avatar";

type LetterFrame = { letter: string; start: number; end: number };

export default function Visualization({
  signingSpeed,
  getNextWord,
  currentWord,
  letterFrames,
  onLetterClick,
  full,
}: {
  signingSpeed: number;
  getNextWord: () => string | null;
  full?: boolean;
  currentWord: string;
  letterFrames?: LetterFrame[];
  onLetterClick?: (lf: LetterFrame) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const frameRef = useRef(0);
  const [activeLetter, setActiveLetter] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!currentWord.startsWith("fs-") || !letterFrames?.length) {
      setActiveLetter("");
      setActiveIdx(-1);
      return;
    }

    const id = setInterval(() => {
      const f = frameRef.current;
      const idx = letterFrames.findIndex((lf) => f >= lf.start && f < lf.end);
      if (idx >= 0) {
        setActiveLetter(letterFrames[idx].letter);
        setActiveIdx(idx);
      } else {
        setActiveLetter("");
        setActiveIdx(-1);
      }
    }, 50);

    return () => clearInterval(id);
  }, [currentWord, letterFrames]);

  const isFingerspell = currentWord.startsWith("fs-");
  const display = isFingerspell ? currentWord.slice(3) : currentWord.toUpperCase();

  return (
    <div
      id="canvas-container"
      className={`relative w-full h-full ${
        full
          ? "bg-black"
          : "bg-gradient-to-br from-neutral-900 via-neutral-800/50 to-neutral-900"
      }`}
    >
      {currentWord && !full && (
        <div className="absolute z-10 top-4 left-0 right-0 flex justify-center pl-[15%] pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 shadow-lg">
            {isFingerspell ? (
              <>
                <span className="text-[10px] font-medium uppercase tracking-wider text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded">
                  Fingerspell
                </span>
                <span className="flex items-center font-mono text-lg font-semibold pointer-events-auto">
                  {display.split("").map((ch, i) => {
                    const isActive = i === activeIdx;
                    const lf = letterFrames?.[i];
                    return (
                      <span
                        key={i}
                        onClick={() => {
                          if (lf && onLetterClick) onLetterClick(lf);
                        }}
                        className={`inline-flex flex-col items-center w-[1.4em] text-center transition-all duration-100 cursor-pointer rounded hover:bg-white/10 py-0.5 ${
                          isActive
                            ? "text-violet-300 scale-110"
                            : "text-white/30 hover:text-white/60"
                        }`}
                      >
                        <span>{ch}</span>
                        {isActive && (
                          <span className="w-1 h-1 rounded-full bg-violet-400 mt-0.5 animate-pulse" />
                        )}
                      </span>
                    );
                  })}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-medium uppercase tracking-wider text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                  Sign
                </span>
                <span className="text-white text-lg font-semibold">
                  {display}
                </span>
              </>
            )}
          </div>
        </div>
      )}
      {mounted && (
        <Canvas gl={{ antialias: false, powerPreference: "low-power" }}>
          <Avatar signingSpeed={signingSpeed} getNextWord={getNextWord} frameRef={frameRef} />
        </Canvas>
      )}
    </div>
  );
}
