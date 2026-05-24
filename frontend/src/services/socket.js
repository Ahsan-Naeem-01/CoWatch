import { io } from 'socket.io-client';

/**
 * Singleton socket. We connect lazily (only when first needed) so the landing
 * page doesn't open a socket before the user actually wants to enter a room.
 */

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

let socket = null;

export function getSocket() {
  if (socket) return socket;
  socket = io(URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
    transports: ['websocket', 'polling'],
    // ngrok free tier shows an interstitial warning page on browser requests
    // to *.ngrok-free.app. The WebSocket upgrade is unaffected, but the HTTP
    // polling fallback transport gets the warning HTML instead of the engine.io
    // handshake. This header tells ngrok to skip the warning for those calls.
    transportOptions: {
      polling: { extraHeaders: { 'ngrok-skip-browser-warning': 'true' } },
    },
  });
  return socket;
}

export function disposeSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
