import { useCallback, useState } from 'react';
import { hashFile } from '../utils/hashFile.js';

/**
 * Computes a SHA-256 signature for the chosen file and exposes progress so
 * the UI can render a determinate bar. The signature object mirrors what the
 * server expects from the `file-hash` event.
 */
export function useFileHash() {
  const [progress, setProgress] = useState(0);
  const [hashing, setHashing] = useState(false);
  const [signature, setSignature] = useState(null);
  const [error, setError] = useState(null);

  const compute = useCallback(async (file) => {
    setError(null);
    setProgress(0);
    setSignature(null);
    if (!file) return null;
    setHashing(true);
    try {
      const hash = await hashFile(file, setProgress);
      const sig = { hash, size: file.size, name: file.name };
      setSignature(sig);
      return sig;
    } catch (e) {
      setError(e?.message || 'Failed to hash file');
      return null;
    } finally {
      setHashing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setHashing(false);
    setSignature(null);
    setError(null);
  }, []);

  return { compute, reset, progress, hashing, signature, error };
}
