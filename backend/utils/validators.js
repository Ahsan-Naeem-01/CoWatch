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

export function validFileSignature(sig) {
  if (!sig || typeof sig !== 'object') return null;
  const { hash, size, name } = sig;
  if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)) return null;
  if (!Number.isFinite(Number(size)) || Number(size) <= 0) return null;
  if (typeof name !== 'string') return null;
  return { hash: hash.toLowerCase(), size: Number(size), name: name.slice(0, 200) };
}
