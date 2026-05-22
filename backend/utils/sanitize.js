/**
 * Input sanitization helpers. The server treats every payload as untrusted —
 * names and chat text are clamped to predictable shapes before being persisted
 * or rebroadcast to other clients.
 */

// Strip ASCII control characters (U+0000-U+001F and DEL U+007F) without
// relying on literal control chars in the source file.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');
const stripControl = (s) => String(s).replace(CONTROL_CHARS, '');

export function sanitizeRoomName(raw) {
  return stripControl(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 48);
}

export function sanitizeUserName(raw) {
  const name = stripControl(raw || '').trim().replace(/\s+/g, ' ').slice(0, 24);
  return name || 'Anonymous';
}

export function sanitizePassword(raw) {
  return stripControl(raw || '').slice(0, 128);
}

export function sanitizeChatMessage(raw) {
  return stripControl(raw || '').trim().slice(0, 500);
}

export function sanitizeFileName(raw) {
  return stripControl(raw || '').trim().slice(0, 200);
}
