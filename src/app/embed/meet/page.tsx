"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

import Visualization from "@/app/components/Visualization";

type AnimationPacket = [string, any];

type ExtensionMessage = {
  source?: string;
  type?: string;
  text?: string;
  options?: {
    useGloss?: boolean;
    asIs?: boolean;
  };
};

let socket: ReturnType<typeof io> | null = null;
const LOG_PREFIX = "[YT-ASL][embed]";
function logMilestone(event: string, data: Record<string, unknown> = {}) {
  // eslint-disable-next-line no-console
  console.log(`${LOG_PREFIX} ${event}`, data);
}

function getSocket() {
  if (!socket) socket = io(process.env.NEXT_PUBLIC_SERVER_URL || "ws://localhost:1234");
  return socket;
}

export default function MeetEmbedPage() {
  const allowedOrigins = useMemo(
    () =>
      new Set([
        "https://www.youtube.com",
        "https://meet.google.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ]),
    [],
  );
  const MAX_QUEUE_SIZE = 60;
  const queueRef = useRef<AnimationPacket[]>([]);
  const currentWordRef = useRef("");
  const [currentWord, setCurrentWord] = useState("");

  useEffect(() => {
    const s = getSocket();

    function onConnect() {
      logMilestone("socket_connected");
    }
    function onDisconnect() {
      logMilestone("socket_disconnected");
    }
    function onAnimation(animations: AnimationPacket[]) {
      if (!Array.isArray(animations) || !animations.length) return;
      queueRef.current = [...queueRef.current, ...animations];
      if (queueRef.current.length > MAX_QUEUE_SIZE) {
        queueRef.current = queueRef.current.slice(queueRef.current.length - MAX_QUEUE_SIZE);
      }
      logMilestone("animation_received", {
        batchSize: animations.length,
        queueSize: queueRef.current.length,
      });
    }

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("E-ANIMATION", onAnimation);
    if (s.connected) onConnect();

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("E-ANIMATION", onAnimation);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (currentWordRef.current !== currentWord) {
        setCurrentWord(currentWordRef.current);
      }
    }, 80);
    return () => clearInterval(id);
  }, [currentWord]);

  useEffect(() => {
    function onMessage(event: MessageEvent<ExtensionMessage>) {
      if (!allowedOrigins.has(event.origin)) return;
      const data = event.data;
      if (data?.source !== "meet-asl-extension") return;
      if (data?.type === "TRANSCRIPT_CLEAR") {
        queueRef.current = [];
        currentWordRef.current = "";
        setCurrentWord("");
        logMilestone("transcript_cleared", { origin: event.origin });
        return;
      }
      if (data?.type !== "TRANSCRIPT_CHUNK") return;
      const text = String(data.text || "").trim();
      if (!text) return;

      logMilestone("transcript_chunk_received", {
        origin: event.origin,
        length: text.length,
      });
      getSocket().emit("E-REQUEST-ANIMATION", {
        text,
        useGloss: Boolean(data.options?.useGloss),
        asIs: Boolean(data.options?.asIs),
      });
      logMilestone("animation_request_emitted", {
        useGloss: Boolean(data.options?.useGloss),
        asIs: Boolean(data.options?.asIs),
      });
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [allowedOrigins]);

  const getNextWord = useMemo(
    () => () => {
      if (!queueRef.current.length) return null;
      const animation = queueRef.current.shift();
      if (!animation) return null;
      currentWordRef.current = animation[0];
      return animation[1];
    },
    [],
  );

  return (
    <div className="h-screen w-screen bg-black">
      <div className="relative h-full w-full">
        <Visualization signingSpeed={80} getNextWord={getNextWord} currentWord={currentWord} full />
      </div>
    </div>
  );
}
