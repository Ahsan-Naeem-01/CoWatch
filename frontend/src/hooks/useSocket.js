import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket.js';

/**
 * Hook around the singleton socket. Exposes the live socket instance plus a
 * connection-status flag so the UI can show "RECONNECTING…" cues.
 */
export function useSocket() {
  const socketRef = useRef(getSocket());
  const [connected, setConnected] = useState(socketRef.current.connected);

  useEffect(() => {
    const socket = socketRef.current;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket: socketRef.current, connected };
}
