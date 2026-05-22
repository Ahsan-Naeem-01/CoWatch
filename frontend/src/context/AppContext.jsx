import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/**
 * Global app context — holds toast notifications and identity (display name)
 * across the lobby and room. Intentionally tiny; room state itself lives in
 * the room page hooks so reconnecting / leaving cleans up naturally.
 */

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem('cowatch:name') || '';
    } catch {
      return '';
    }
  });
  const toastIdRef = useRef(0);

  const pushToast = useCallback((toast) => {
    const id = ++toastIdRef.current;
    const payload = {
      id,
      kind: toast.kind || 'info', // 'info' | 'success' | 'warn' | 'error'
      title: toast.title || '',
      body: toast.body || '',
      ttl: toast.ttl ?? 4200,
    };
    setToasts((prev) => [...prev, payload]);
    if (payload.ttl > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, payload.ttl);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateUserName = useCallback((name) => {
    setUserName(name);
    try {
      localStorage.setItem('cowatch:name', name);
    } catch {
      // ignore — non-fatal
    }
  }, []);

  const value = useMemo(
    () => ({ toasts, pushToast, dismissToast, userName, setUserName: updateUserName }),
    [toasts, pushToast, dismissToast, userName, updateUserName]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
