import { useCallback, useEffect, useRef } from 'react';

/**
 * Bidirectional sync between a local <video> and a room's playback state.
 *
 *   - Local user actions (play / pause / seek / ratechange) emit socket events.
 *   - Remote events from peers are applied to the video without re-emitting,
 *     using a one-tick "remote-event-in-flight" flag.
 *   - `applySnapshot` is used on initial metadata-load (and on reconnect) to
 *     hard-set the video to the server's authoritative state. Late-joining
 *     peers land at the correct currentTime because the server projects the
 *     playhead forward at read time.
 *
 * NOTE: we deliberately do NOT run a drift-correction loop or send periodic
 * heartbeats. Sync is event-driven: as long as play/pause/seek events are
 * delivered, peers stay aligned. Removing the loop avoids spurious seeks and
 * playbackRate "nudges" that fought with normal playback.
 */

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
  const autoplayPrimed = useRef(false);

  /** Apply a remote-originated change without emitting it back to the room. */
  const applyRemote = useCallback(
    (fn) => {
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
    },
    [videoRef]
  );

  /**
   * Browsers reject `video.play()` when the element has never seen a user
   * gesture. Muted autoplay, however, is universally allowed. For non-host
   * viewers we force `muted = true` on the first programmatic play so playback
   * starts immediately; once they click the volume control to re-enable sound,
   * subsequent remote events respect that choice.
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

  // Wire native video events. `fileReady` is in the dep list so this effect
  // re-runs the moment the <video> element mounts (refs don't trigger
  // re-renders by themselves).
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

  /** Apply a full authoritative snapshot (used after reconnect / late-join). */
  const applySnapshot = useCallback(
    (playback) => {
      if (!playback) return;
      applyRemote((v) => {
        if (Math.abs(v.currentTime - playback.currentTime) > 0.4) {
          v.currentTime = playback.currentTime;
        }
        v.playbackRate = playback.playbackRate || 1;
        if (playback.isPlaying) safePlay(v);
        else v.pause();
      });
    },
    [applyRemote, safePlay]
  );

  return { applySnapshot };
}
