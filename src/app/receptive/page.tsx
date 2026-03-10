"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Camera from "../components/Camera";
import Checkbox from "@/ui/components/Checkbox";
import Transcription from "../components/Transcription";
import { getAppSocket } from "@/lib/socket";
function getSocket() {
  const socketUrl = process.env.NEXT_PUBLIC_SERVER_URL || "ws://localhost:1234";
  // #region agent log
  fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run2',hypothesisId:'H8',location:'src/app/receptive/page.tsx:getSocket',message:'Using shared app socket with browser context',data:{socketUrl,origin:typeof window !== 'undefined' ? window.location.origin : null,protocol:typeof window !== 'undefined' ? window.location.protocol : null,userAgent:typeof navigator !== 'undefined' ? navigator.userAgent : null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return getAppSocket(socketUrl);
}

export default function Receptive() {
  const [connected, setConnected] = useState(false);
  const [ASLTranscription, setASLTranscription] = useState("");

  useEffect(() => {
    const s = getSocket();
    // #region agent log
    fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run1',hypothesisId:'H2',location:'src/app/receptive/page.tsx:useEffect',message:'Receptive effect mounted',data:{initialConnected:s.connected,transport:s.io.engine?.transport?.name || null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    function onConnect() {
      // #region agent log
      fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run1',hypothesisId:'H2',location:'src/app/receptive/page.tsx:onConnect',message:'Receptive socket connected',data:{connected:s.connected,transport:s.io.engine?.transport?.name || null,id:s.id || null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setConnected(true);
    }
    function onDisconnect(reason: string) {
      // #region agent log
      fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run1',hypothesisId:'H3',location:'src/app/receptive/page.tsx:onDisconnect',message:'Receptive socket disconnected',data:{reason,connected:s.connected,id:s.id || null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setConnected(false);
    }
    function onConnectError(error: Error) {
      // #region agent log
      fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run2',hypothesisId:'H9',location:'src/app/receptive/page.tsx:onConnectError',message:'Receptive socket connect_error details',data:{errorName:error?.name || 'Error',errorMessage:error?.message || '',errorDescription:(error as any)?.description || null,errorContext:(error as any)?.context || null,connected:s.connected},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }
    function onTranscription(data: string) { setASLTranscription(data); }

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);
    s.on("R-TRANSCRIPTION", onTranscription);

    if (s.connected) setConnected(true);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);
      s.off("R-TRANSCRIPTION", onTranscription);
    };
  }, []);

  function clear() {
    getSocket().emit("R-CLEAR-TRANSCRIPTION");
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-neutral-100">ASL Fingerspell → English</h1>
              <p className="text-[11px] text-neutral-500">Sign to your camera to translate</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? "bg-neutral-300" : "bg-neutral-600"}`} />
          <span className="text-xs text-neutral-400">{connected ? "Connected" : "Disconnected"}</span>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-0 p-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-neutral-800 bg-neutral-900/50">
          <div className="flex-1 min-h-[300px] relative">
            <Camera />
          </div>

          <Transcription
            content={ASLTranscription}
            placeholder="ASL transcription will appear here..."
          />

          <div className="space-y-3 border-t border-neutral-800 bg-neutral-900 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <Checkbox label="Autocorrect" />
              <button
                onClick={clear}
                className="rounded border border-neutral-700 bg-neutral-950 px-4 py-1.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
