import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Bidirectional sync between a local <video> and a room's playback state.
 *
 *   - Local user actions (play/pause/seek/ratechange) emit socket events.
 *   - Remote events from peers are applied to the video without re-emitting,
 *     using a one-tick "remote-event-in-flight" flag.
 *   - Drift reports from the server snap the local time when divergence
 *     exceeds the threshold; small drift is corrected smoothly by nudging
 *     playbackRate for a brief window.
 *   - Heartbeats are sent at a fixed cadence while a file is loaded.
 */

const HEARTBEAT_MS = 3000;
const SMOOTH_CORRECTION_MS = 1200;
const HARD_SNAP_THRESHOLD_S = 1.5;

export function useVideoSync({
  socket,
  videoRef,
  canControl,
  fileReady,
  isHost,
  onAutoplayBlocked,
}) {
  const remoteEventInFlight = useRef(false);
  const lastSeekSentAt = useRef(0);
  const correctionTimer = useRef(null);
  const autoplayPrimed = useRef(false);
  const [driftMs, setDriftMs] = useState(0);
  const [syncing, setSyncing] = useState(false);

  /** Apply a remote-originated change without emitting it back to the room. */
  const applyRemote = useCallback((fn) => {
    const video = videoRef.current;
    if (!video) return;
    remoteEventInFlight.current = true;
    try {
      fn(video);
    } finally {
      // Release the flag after the resulting events have flushed.
      setTimeout(() => {
        remoteEventInFlight.current = false;
      }, 50);
    }
  }, [videoRef]);

  /**
   * Browsers reject `video.play()` when the element has never seen a user
   * gesture — so a peer who is just sitting in the room can't be started by
   * a remote-play event. Muted autoplay, however, is universally allowed.
   *
   * Strategy: on the *first* programmatic play for a non-host viewer, force
   * `muted = true` so playback starts immediately. After that we stop forcing
   * the flag, so once the viewer clicks the volume control to re-enable
   * sound, subsequent remote events respect their choice. Hosts never go
   * through this path for their own actions (those originate from a real
   * click) — only when they receive remote events under "allow all to
   * control", which we skip muting for so they don't lose sound.
   */
  const safePlay = useCallback(
    (video) => {
      if (!isHost && !autoplayPrimed.current) {
        video.muted = true;
        autoplayPrimed.current = true;
      }
      const first = video.play();
      if (!first || typeof first.then !== 'function') return;
      first.catch(() => {
        // Last-resort defense if even muted playback was rejected.
        video.muted = true;
        const second = video.play();
        if (!second || typeof second.then !== 'function') return;
        second.catch(() => {
          onAutoplayBlocked?.();
        });
      });
    },
    [isHost, onAutoplayBlocked]
  );

  // ---------- Outbound: emit local actions ----------

  const handlePlay = useCallback(() => {
    if (remoteEventInFlight.current) return;
    const video = videoRef.current;
    if (!video || !canControl) return;
    socket.emit('play', { currentTime: video.currentTime });
  }, [socket, videoRef, canControl]);

  const handlePause = useCallback(() => {
    if (remoteEventInFlight.current) return;
    const video = videoRef.current;
    if (!video || !canControl) return;
    socket.emit('pause', { currentTime: video.currentTime });
  }, [socket, videoRef, canControl]);

  const handleSeeked = useCallback(() => {
    if (remoteEventInFlight.current) return;
    const video = videoRef.current;
    if (!video || !canControl) return;
    // Debounce noisy native seek events.
    const now = Date.now();
    if (now - lastSeekSentAt.current < 80) return;
    lastSeekSentAt.current = now;
    socket.emit('seek', { currentTime: video.currentTime });
  }, [socket, videoRef, canControl]);

  const handleRateChange = useCallback(() => {
    if (remoteEventInFlight.current) return;
    const video = videoRef.current;
    if (!video || !canControl) return;
    socket.emit('playback-rate', { playbackRate: video.playbackRate });
  }, [socket, videoRef, canControl]);

  // Wire native video events.
  //
  // IMPORTANT: `fileReady` is in the dep list. Refs don't trigger re-renders,
  // so without an observable signal that flips when the <video> element gets
  // mounted (it only renders after the user picks a file), this effect would
  // run once at hook init with `videoRef.current === null`, return early, and
  // never run again — leaving the native play/pause/seek/ratechange events
  // permanently unwired. `fileReady` becomes true the moment we have an
  // object URL (which is also when VideoPlayer mounts and populates the ref),
  // so the effect re-runs at exactly the right time.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('ratechange', handleRateChange);
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('ratechange', handleRateChange);
    };
  }, [videoRef, fileReady, handlePlay, handlePause, handleSeeked, handleRateChange]);

  // ---------- Inbound: remote events ----------

  useEffect(() => {
    const onRemotePlay = ({ currentTime }) => {
      applyRemote((v) => {
        if (Math.abs(v.currentTime - currentTime) > 0.4) v.currentTime = currentTime;
        safePlay(v);
      });
    };
    const onRemotePause = ({ currentTime }) => {
      applyRemote((v) => {
        v.pause();
        if (Math.abs(v.currentTime - currentTime) > 0.4) v.currentTime = currentTime;
      });
    };
    const onRemoteSeek = ({ currentTime }) => {
      applyRemote((v) => {
        v.currentTime = currentTime;
      });
    };
    const onRemoteRate = ({ playbackRate }) => {
      applyRemote((v) => {
        v.playbackRate = playbackRate;
      });
    };

    socket.on('remote-play', onRemotePlay);
    socket.on('remote-pause', onRemotePause);
    socket.on('remote-seek', onRemoteSeek);
    socket.on('remote-rate', onRemoteRate);

    return () => {
      socket.off('remote-play', onRemotePlay);
      socket.off('remote-pause', onRemotePause);
      socket.off('remote-seek', onRemoteSeek);
      socket.off('remote-rate', onRemoteRate);
    };
  }, [socket, applyRemote, safePlay]);

  // ---------- Drift correction ----------

  useEffect(() => {
    const onDrift = ({ driftMs: ms, referenceTime, shouldCorrect }) => {
      setDriftMs(ms);
      const video = videoRef.current;
      if (!video || !shouldCorrect) return;

      const absSec = Math.abs(ms) / 1000;
      if (absSec >= HARD_SNAP_THRESHOLD_S) {
        // Big gap — snap.
        applyRemote((v) => {
          v.currentTime = referenceTime;
        });
        setSyncing(true);
        clearTimeout(correctionTimer.current);
        correctionTimer.current = setTimeout(() => setSyncing(false), 600);
      } else {
        // Small gap — nudge rate briefly.
        const naturalRate = video.playbackRate;
        const nudgeRate = ms > 0 ? naturalRate * 0.92 : naturalRate * 1.08;
        applyRemote((v) => {
          v.playbackRate = nudgeRate;
        });
        setSyncing(true);
        clearTimeout(correctionTimer.current);
        correctionTimer.current = setTimeout(() => {
          applyRemote((v) => {
            v.playbackRate = naturalRate;
          });
          setSyncing(false);
        }, SMOOTH_CORRECTION_MS);
      }
    };
    socket.on('drift-report', onDrift);
    return () => socket.off('drift-report', onDrift);
  }, [socket, videoRef, applyRemote]);

  // ---------- Heartbeat ----------

  useEffect(() => {
    if (!fileReady) return undefined;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      socket.emit('heartbeat', { currentTime: video.currentTime });
    }, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [socket, videoRef, fileReady]);

  /** Apply a full authoritative snapshot (used after reconnect / late-join). */
  const applySnapshot = useCallback(
    (playback) => {
      if (!playback) return;
      applyRemote((v) => {
        v.currentTime = playback.currentTime;
        v.playbackRate = playback.playbackRate || 1;
        if (playback.isPlaying) safePlay(v);
        else v.pause();
      });
    },
    [applyRemote, safePlay]
  );

  return { driftMs, syncing, applySnapshot };
}
