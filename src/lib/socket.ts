import { io } from "socket.io-client";

let appSocket: ReturnType<typeof io> | null = null;
let appSocketUrl: string | null = null;

function normalizeSocketUrl(url: string) {
  if (url.startsWith("ws://")) return url.replace("ws://", "http://");
  if (url.startsWith("wss://")) return url.replace("wss://", "https://");
  return url;
}

export function getAppSocket(url: string) {
  const normalizedUrl = normalizeSocketUrl(url);

  if (appSocket && appSocketUrl && appSocketUrl !== normalizedUrl) {
    appSocket.disconnect();
    appSocket = null;
  }

  if (!appSocket) {
    appSocket = io(normalizedUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });
    appSocketUrl = normalizedUrl;
  } else if (!appSocket.connected) {
    appSocket.connect();
  }

  return appSocket;
}
