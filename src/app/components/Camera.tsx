"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getAppSocket } from "@/lib/socket";

type CameraProps = {
  mode?: "community" | "expressive";
};

function getStreamSocket() {
  const streamSocketUrl = process.env.NEXT_PUBLIC_SERVER_URL || "ws://localhost:1234";
  // #region agent log
  fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'post-fix',hypothesisId:'H7',location:'src/app/components/Camera.tsx:getStreamSocket',message:'Using shared app socket for stream',data:{streamSocketUrl},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return getAppSocket(streamSocketUrl);
}

export default function Camera({ mode }: CameraProps) {
  const pathname = usePathname();
  const base = process.env.NEXT_PUBLIC_CAMERA_URL || "http://localhost:1234";
  const streamMode = process.env.NEXT_PUBLIC_REMOTE_CAMERA_STREAM === "1";
  const resolvedMode = mode || (pathname === "/expressive" ? "expressive" : undefined);
  const params = new URLSearchParams();
  if (resolvedMode) params.set("mode", resolvedMode);
  if (pathname === "/expressive") params.set("fit", "cover");
  const src = params.toString() ? `${base}?${params.toString()}` : base;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const shouldStream =
    pathname === "/receptive" ||
    pathname === "/community" ||
    pathname === "/expressive";
  const shouldSendFrames = pathname === "/receptive" || pathname === "/community";
  const iframeSrc = shouldStream ? src : "about:blank";
  const [isLoading, setIsLoading] = useState(shouldStream);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const streamStartedRef = useRef(false);
  const streamStatusRef = useRef<"idle" | "started" | "error">("idle");

  useEffect(() => {
    return () => {
      if (frameTimerRef.current != null) {
        window.clearInterval(frameTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (streamStartedRef.current) {
        getStreamSocket().emit("R-FRAME-STREAM-STOP");
        streamStartedRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (!streamMode) {
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.src = iframeSrc;
      }
      return () => {
        if (iframe) {
          iframe.src = "about:blank";
        }
      };
    }
  }, [iframeSrc, streamMode]);

  useEffect(() => {
    setIsLoading(shouldStream);
  }, [shouldStream, streamMode]);

  useEffect(() => {
    if (!streamMode || !shouldStream) return;

    const socket = getStreamSocket();
    // #region agent log
    fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run1',hypothesisId:'H4',location:'src/app/components/Camera.tsx:streamEffect',message:'Remote stream effect started',data:{pathname,streamMode,shouldStream,shouldSendFrames,socketConnected:socket.connected},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const video = videoRef.current;
    let cancelled = false;
    function onSocketConnect() {
      // #region agent log
      fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run1',hypothesisId:'H6',location:'src/app/components/Camera.tsx:onSocketConnect',message:'Stream socket connected',data:{socketId:socket.id || null,transport:socket.io.engine?.transport?.name || null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }
    function onSocketDisconnect(reason: string) {
      // #region agent log
      fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run1',hypothesisId:'H6',location:'src/app/components/Camera.tsx:onSocketDisconnect',message:'Stream socket disconnected',data:{reason,socketId:socket.id || null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }
    function onSocketConnectError(error: Error) {
      // #region agent log
      fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run1',hypothesisId:'H6',location:'src/app/components/Camera.tsx:onSocketConnectError',message:'Stream socket connect_error',data:{errorName:error?.name || 'Error',errorMessage:error?.message || ''},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }
    socket.on("connect", onSocketConnect);
    socket.on("disconnect", onSocketDisconnect);
    socket.on("connect_error", onSocketConnectError);

    function onStreamStatus(payload: { state?: "started" | "stopped" | "error" }) {
      // #region agent log
      fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run1',hypothesisId:'H4',location:'src/app/components/Camera.tsx:onStreamStatus',message:'Remote stream status update',data:{state:payload?.state || null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (payload?.state === "started") {
        streamStatusRef.current = "started";
      } else if (payload?.state === "error") {
        streamStatusRef.current = "error";
      }
    }

    socket.on("R-FRAME-STREAM-STATUS", onStreamStatus);

    async function startLocalCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15, max: 20 },
            facingMode: "user",
          },
          audio: false,
        });
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = mediaStream;
        if (!video) return;
        video.srcObject = mediaStream;
        await video.play();
        if (cancelled) return;

        setIsLoading(false);
        // #region agent log
        fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run1',hypothesisId:'H5',location:'src/app/components/Camera.tsx:startLocalCamera',message:'getUserMedia succeeded',data:{videoWidth:video?.videoWidth || null,videoHeight:video?.videoHeight || null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        if (shouldSendFrames) {
          // #region agent log
          fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run1',hypothesisId:'H4',location:'src/app/components/Camera.tsx:startLocalCamera',message:'Emitting frame stream start',data:{mode:resolvedMode || 'receptive',socketConnected:socket.connected},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          socket.emit("R-FRAME-STREAM-START", { mode: resolvedMode || "receptive" });
          streamStartedRef.current = true;
          frameTimerRef.current = window.setInterval(() => {
            if (streamStatusRef.current === "error") return;
            const canvas = canvasRef.current;
            if (!canvas || !video.videoWidth || !video.videoHeight) return;
            const context = canvas.getContext("2d");
            if (!context) return;
            canvas.width = 640;
            canvas.height = 480;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = canvas.toDataURL("image/jpeg", 0.55);
            socket.emit("R-FRAME", { frame });
          }, 100);
        }
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7519/ingest/64dda2b4-140a-49f1-ba1b-f998fd96674f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c418a'},body:JSON.stringify({sessionId:'4c418a',runId:'run1',hypothesisId:'H5',location:'src/app/components/Camera.tsx:startLocalCamera:catch',message:'getUserMedia failed',data:{errorName:error instanceof Error ? error.name : 'unknown',errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setIsLoading(false);
      }
    }

    startLocalCamera();

    return () => {
      cancelled = true;
      socket.off("connect", onSocketConnect);
      socket.off("disconnect", onSocketDisconnect);
      socket.off("connect_error", onSocketConnectError);
      socket.off("R-FRAME-STREAM-STATUS", onStreamStatus);
      if (frameTimerRef.current != null) {
        window.clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      }
      if (streamStartedRef.current) {
        socket.emit("R-FRAME-STREAM-STOP");
        streamStartedRef.current = false;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (video) {
        video.srcObject = null;
      }
    };
  }, [shouldStream, shouldSendFrames, resolvedMode, streamMode]);

  return (
    <div className="relative h-full w-full">
      {streamMode ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          <canvas ref={canvasRef} className="hidden" />
        </>
      ) : (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="h-full w-full border-0"
          allow="camera"
          loading="lazy"
          onLoad={() => setIsLoading(false)}
        />
      )}
      {shouldStream && isLoading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-neutral-950/65 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-200" />
            <span className="text-[11px] text-neutral-300">Connecting camera...</span>
          </div>
        </div>
      )}
    </div>
  );
}
