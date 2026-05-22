import { useCallback, useEffect, useRef } from 'react';

/**
 * Bidirectional sync between a local <video> and a room's playback state.
 *
 *   - Local user actions (play / pause / seek / ratechange) emit socket events.
 *   - Remote events from peers are applied to the video without re-emitting.
 *   - `applySnapshot` is used on initial metadata-load (and on reconnect) to
 *     hard-set the video to the server's authoritative state. Late-joining
 *     peers land at the correct currentTime because the server projects the
 *     playhead forward at read time.
 *
 * Loop prevention
 * ---------------
 * Native <video> events that result from a programmatic change (setting
 * `currentTime`, calling `play()`, etc.) fire *asynchronously*. A naive
 * "remote-event-in-flight" flag with a short timeout would clear before the
 * resulting `seeked`/`play`/`pause` actually fires when the browser is
 * buffering — and then the peer would re-emit the event back to the room,
 * sending the originator into a feedback loop that visibly stalls playback.
 *
 * Instead we track *what* was applied from a remote source and ignore the
 * matching native event when it eventually lands:
 *
 *   - For play/pause/ratechange: timestamp the last remote application of
 *     that kind. Any native event of the same kind within REMOTE_WINDOW_MS is
 *     treated as the echo and suppressed.
 *   - For seek: push the target timestamp onto a small queue. When a `seeked`
 *     event arrives, pop the queue entry whose target time matches the
 *     current `currentTime` within SEEK_TOLERANCE seconds (covers floating-
 *     point and natural playback advance during the seek itself). Entries
 *     older than REMOTE_WINDOW_MS are auto-pruned in case the browser never
 *     fires `seeked` for an apply.
 *
 * NOTE: we deliberately do NOT run a drift-correction loop or send periodic
 * heartbeats. Sync is event-driven.
 */

const REMOTE_WINDOW_MS = 1500;
const SEEK_TOLERANCE = 0.75;

export function useVideoSync({
  socket,
  videoRef,
  canControl,
  fileReady,
  isHost,
  onAutoplayBlocked,
}) {
  // Per-kind timestamps of the most recent remote-originated apply.
  const remoteApplyAt = useRef({ play: 0, pause: 0, rate: 0 });
  // Queue of remote seek targets that haven't been matched to a native
  // `seeked` event yet — { at: ms, time: seconds }.
  const remoteSeekTargets = useRef([]);
  const lastSeekSentAt = useRef(0);
  const autoplayPrimed = useRef(false);

  // ---------- Remote-apply bookkeeping ----------

  const markRemoteApply = useCallback((kind) => {
    remoteApplyAt.current[kind] = Date.now();
  }, []);

  const isRecentRemoteApply = useCallback((kind) => {
    return Date.now() - remoteApplyAt.current[kind] < REMOTE_WINDOW_MS;
  }, []);

  const markRemoteSeek = useCallback((time) => {
    const now = Date.now();
    remoteSeekTargets.current = [
      ...remoteSeekTargets.current.filter((s) => now - s.at < REMOTE_WINDOW_MS),
      { at: now, time },
    ];
  }, []);

  /**
   * Returns true if the given currentTime matches a pending remote seek
   * target. Matching consumes the entry so a *later* legitimate seek to the
   * same neighbourhood isn't suppressed.
   */
  const consumeRemoteSeek = useCallback((currentTime) => {
    const now = Date.now();
    const fresh = remoteSeekTargets.current.filter((s) => now - s.at < REMOTE_WINDOW_MS);
    const idx = fresh.findIndex((s) => Math.abs(s.time - currentTime) <= SEEK_TOLERANCE);
    if (idx === -1) {
      remoteSeekTargets.current = fresh;
      return false;
    }
    fresh.splice(idx, 1);
    remoteSeekTargets.current = fresh;
    return true;
  }, []);

  // ---------- safePlay ----------
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
    if (isRecentRemoteApply('play')) return;
    const video = videoRef.current;
    if (!video || !canControl) return;
    socket.emit('play', { currentTime: video.currentTime });
  }, [socket, videoRef, canControl, isRecentRemoteApply]);

  const handlePause = useCallback(() => {
    if (isRecentRemoteApply('pause')) return;
    const video = videoRef.current;
    if (!video || !canControl) return;
    socket.emit('pause', { currentTime: video.currentTime });
  }, [socket, videoRef, canControl, isRecentRemoteApply]);

  const handleSeeked = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // Always check remote-seek echoes first, even when we have no control —
    // it keeps the queue clean and avoids accidental future suppression.
    if (consumeRemoteSeek(video.currentTime)) return;
    if (!canControl) return;
    const now = Date.now();
    if (now - lastSeekSentAt.current < 80) return;
    lastSeekSentAt.current = now;
    socket.emit('seek', { currentTime: video.currentTime });
  }, [socket, videoRef, canControl, consumeRemoteSeek]);

  const handleRateChange = useCallback(() => {
    if (isRecentRemoteApply('rate')) return;
    const video = videoRef.current;
    if (!video || !canControl) return;
    socket.emit('playback-rate', { playbackRate: video.playbackRate });
  }, [socket, videoRef, canControl, isRecentRemoteApply]);

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
      const video = videoRef.current;
      if (!video) return;
      if (Math.abs(video.currentTime - currentTime) > 0.4) {
        markRemoteSeek(currentTime);
        video.currentTime = currentTime;
      }
      markRemoteApply('play');
      safePlay(video);
    };
    const onRemotePause = ({ currentTime }) => {
      const video = videoRef.current;
      if (!video) return;
      markRemoteApply('pause');
      video.pause();
      if (Math.abs(video.currentTime - currentTime) > 0.4) {
        markRemoteSeek(currentTime);
        video.currentTime = currentTime;
      }
    };
    const onRemoteSeek = ({ currentTime }) => {
      const video = videoRef.current;
      if (!video) return;
      // Skip a no-op (within tolerance) — setting currentTime to the same
      // value still fires `seeked` in some browsers, which would consume one
      // of our own pending tokens incorrectly.
      if (Math.abs(video.currentTime - currentTime) <= 0.05) return;
      markRemoteSeek(currentTime);
      video.currentTime = currentTime;
    };
    const onRemoteRate = ({ playbackRate }) => {
      const video = videoRef.current;
      if (!video) return;
      if (video.playbackRate === playbackRate) return;
      markRemoteApply('rate');
      video.playbackRate = playbackRate;
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
  }, [socket, videoRef, safePlay, markRemoteApply, markRemoteSeek]);

  /** Apply a full authoritative snapshot (used after reconnect / late-join). */
  const applySnapshot = useCallback(
    (playback) => {
      const video = videoRef.current;
      if (!video || !playback) return;
      if (Math.abs(video.currentTime - (playback.currentTime || 0)) > 0.4) {
        markRemoteSeek(playback.currentTime || 0);
        video.currentTime = playback.currentTime || 0;
      }
      const targetRate = playback.playbackRate || 1;
      if (video.playbackRate !== targetRate) {
        markRemoteApply('rate');
        video.playbackRate = targetRate;
      }
      if (playback.isPlaying) {
        if (video.paused) {
          markRemoteApply('play');
          safePlay(video);
        }
      } else if (!video.paused) {
        markRemoteApply('pause');
        video.pause();
      }
    },
    [videoRef, safePlay, markRemoteApply, markRemoteSeek]
  );

  return { applySnapshot };
}
