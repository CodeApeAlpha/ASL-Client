"use client";

import React from "react";
import io from "socket.io-client";
import "regenerator-runtime/runtime";
import { useEffect, useRef, useState } from "react";

import { Slider } from "@/ui/components/Slider";
import Visualization from "../components/Visualization";

const socket = io(process.env.NEXT_PUBLIC_SERVER_URL || "ws://localhost:1234");

export default function Home() {
  const wordAnimationsToPlay = useRef<any>([]);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [signingSpeed, setSigningSpeed] = useState<number>(50);
  const [text, setText] = useState<string>("");
  const [duration, setDuration] = useState<string>("1");

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to server");
    });

    socket.on("E-ANIMATION", (animations) => {
      // if (duration != "0") {
      //   setSigningSpeed(
      //     Math.floor(animations[0][1].length / parseFloat(duration))
      //   );
      // }

      wordAnimationsToPlay.current = [
        ...wordAnimationsToPlay.current,
        ...animations,
      ];
    });
  }, []);

  function getNextWord(): string | null {
    if (!wordAnimationsToPlay.current.length) {
      return null;
    }

    let animation = wordAnimationsToPlay.current.shift();
    setCurrentWord(animation[0]);

    return animation[1];
  }

  return (
    <div className="flex h-screen w-screen flex-row gap-4 bg-neutral-950 p-4">
      <div className="flex w-80 flex-col items-start gap-6 border border-neutral-800 bg-neutral-900 px-4 py-4">
        <p className="text-3xl font-semibold text-neutral-100">Express</p>
        <div className="flex w-full flex-col gap-1">
          <p className="text-lg text-neutral-200">Signing Speed</p>
          <Slider
            defaultValue={[signingSpeed]}
            value={[signingSpeed]}
            onValueChange={(value) => setSigningSpeed(value[0])}
            min={20}
            max={100}
            step={1}
          />
        </div>
        <div className="flex w-full flex-col items-start justify-start gap-1">
          <p className="text-lg text-neutral-200">Duration</p>
          <input
            value={duration}
            placeholder="Enter duration (in seconds)"
            onChange={(e) => setDuration(e.target.value)}
            className="w-full border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
          />
        </div>
        <div className="flex h-full w-full flex-col items-start justify-start gap-1">
          <p className="text-lg text-neutral-200">Content</p>
          <textarea
            value={text}
            placeholder="Enter text to sign"
            onChange={(e) => setText(e.target.value)}
            className="h-full w-full border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
          />
        </div>
        <div
          className="flex w-full items-center justify-center border border-neutral-700 bg-neutral-800 py-2 transition duration-300 hover:bg-neutral-700"
          onClick={() => socket.emit("E-REQUEST-ANIMATION", text)}
        >
          <p className="select-none text-neutral-100">Render</p>
        </div>
      </div>
      <Visualization
        full
        signingSpeed={signingSpeed}
        getNextWord={getNextWord}
        currentWord={currentWord}
      />
    </div>
  );
}
