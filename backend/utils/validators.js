/**
 * Validators for socket event payloads. Each returns either a normalized value
 * or `null` to indicate the input should be rejected by the caller.
 */

export function validTimestamp(value) {
  const t = Number(value);
  if (!Number.isFinite(t)) return null;
  if (t < 0) return null;
  if (t > 60 * 60 * 24) return null; // sanity: < 24h video
  return t;
}

export function validPlaybackRate(value) {
  const r = Number(value);
  if (!Number.isFinite(r)) return null;
  if (r < 0.25 || r > 4) return null;
  return Math.round(r * 100) / 100;
}

export function validBoolean(value) {
  return value === true || value === false ? value : null;
}
