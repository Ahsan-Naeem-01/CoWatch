/**
 * Compute the SHA-256 of a local File using Web Crypto. Large files are
 * chunked so the UI thread can report progress without blocking the user.
 */

const CHUNK = 4 * 1024 * 1024; // 4 MB

export async function hashFile(file, onProgress) {
  if (!file) throw new Error('No file provided');

  // For files small enough to fit comfortably in memory, do it in one shot —
  // Web Crypto's digest() can't be fed incrementally, so we hash the full
  // ArrayBuffer. For very large files we still load all chunks, but yield
  // back to the event loop between reads so the UI stays responsive.
  const buffers = [];
  let read = 0;
  while (read < file.size) {
    const end = Math.min(read + CHUNK, file.size);
    const slice = file.slice(read, end);
    // eslint-disable-next-line no-await-in-loop
    const buf = await slice.arrayBuffer();
    buffers.push(new Uint8Array(buf));
    read = end;
    if (onProgress) onProgress(read / file.size);
    // Let the browser breathe between chunks.
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }

  const total = buffers.reduce((n, b) => n + b.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const b of buffers) {
    merged.set(b, offset);
    offset += b.length;
  }

  const digest = await crypto.subtle.digest('SHA-256', merged);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}
