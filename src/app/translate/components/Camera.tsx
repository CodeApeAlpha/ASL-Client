import * as cam from "@mediapipe/camera_utils";
import React, { useRef, useEffect } from "react";
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

const Camera = () => {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!canvas.current || !video.current) return;

    canvas.current.style.width = "100%";
    ctx.current = canvas.current.getContext("2d");

    const hands = new Hands({
      locateFile: (file) => {
        return `/landmarker/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    const videoEl = video.current;
    const camera = new cam.Camera(videoEl, {
      onFrame: async () => {
        await hands.send({ image: videoEl });
      },
    });
    camera.start();

    function onResults(results: any) {
      if (!ctx.current || !canvas.current) return;
      ctx.current.clearRect(0, 0, canvas.current.width, canvas.current.height);
      ctx.current.drawImage(
        results.image,
        0,
        0,
        canvas.current.width,
        canvas.current.height,
      );
      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx.current, landmarks, HAND_CONNECTIONS);
          drawLandmarks(ctx.current, landmarks);
        }
      }
    }

    return () => {
      camera.stop();
      const stream = videoEl.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        videoEl.srcObject = null;
      }
      hands.close();
    };
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-xl outline outline-[5px] outline-blue-400">
      <video ref={video} style={{ display: "none" }}></video>
      <canvas ref={canvas} width="960" height="720"></canvas>
    </div>
  );
};

export default Camera;
