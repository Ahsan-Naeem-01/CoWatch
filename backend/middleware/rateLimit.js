/**
 * Per-socket sliding-window rate limiter. Keeps a small ring of recent event
 * timestamps and rejects events when the rate is exceeded. Cheap, predictable,
 * and resets when the socket disconnects (state lives on the socket instance).
 */

const WINDOW_MS = 1_000;
const DEFAULT_MAX = Number(process.env.RATE_LIMIT_EVENTS_PER_SEC) || 25;

export function attachRateLimiter(socket, max = DEFAULT_MAX) {
  socket.data._events = [];

  socket.allowEvent = () => {
    const now = Date.now();
    const ring = socket.data._events;
    while (ring.length && now - ring[0] > WINDOW_MS) ring.shift();
    if (ring.length >= max) return false;
    ring.push(now);
    return true;
  };
}
