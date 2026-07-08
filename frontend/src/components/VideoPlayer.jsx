import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../utils/formatTime.js';
import { Icon } from './Icon.jsx';
import {
  ReactionLauncher,
  ReactionOverlay,
} from './EmojiReactions.jsx';

/**
 * Custom HTML5 video player with the Midnight theme. Native controls are
 * hidden so we can render a coherent control bar (and so we can disable
 * controls for non-host viewers when allowAllControl is off).
 */

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function VideoPlayer({
  videoRef,
  src,
  file,
  canControl,
  isHost,
  roomPlayback,
  onMetadataLoaded,
  onAutoplayBlocked,
  autoplayBlocked,
  onResolveAutoplay,
  reactions = [],
  onSendReaction,
  onExpireReaction,
}) {
  const [playing, setPlaying] = useState(roomPlayback?.isPlaying || false);
  const [time, setTime] = useState(roomPlayback?.currentTime || 0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rateOpen, setRateOpen] = useState(false);
  const [showSubsInput, setShowSubsInput] = useState(false);
  const [subtitleTrack, setSubtitleTrack] = useState(null);
  const [mouseActive, setMouseActive] = useState(false);
  const [controlsHover, setControlsHover] = useState(false);
  const [scrubHover, setScrubHover] = useState(null);
  const containerRef = useRef(null);
  const scrubRef = useRef(null);
  const clickTimerRef = useRef(null);
  const idleTimerRef = useRef(null);

  const showControls = !playing || controlsHover || mouseActive;

  const bumpActivity = () => {
    setMouseActive(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setMouseActive(false), 2000);
  };

  const onSurfaceLeave = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setMouseActive(false);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setTime(v.currentTime);
    const onMeta = () => {
      setDuration(v.duration || 0);
      onMetadataLoaded?.();
    };
    const onVol = () => {
      setMuted(v.muted);
      setVolume(v.volume);
    };
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('volumechange', onVol);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('volumechange', onVol);
    };
  }, [videoRef, onMetadataLoaded]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !canControl) return;
    if (v.paused) {
      v.play().catch(() => onAutoplayBlocked?.());
    } else {
      v.pause();
    }
  };

  const onScrub = (e) => {
    if (!canControl) return;
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = Math.max(0, Math.min(duration, pct * duration));
  };

  const onScrubHover = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setScrubHover({ pct: ratio * 100, time: ratio * duration });
  };

  const onScrubLeave = () => setScrubHover(null);

  const onChangeRate = (r) => {
    const v = videoRef.current;
    if (!v || !canControl) return;
    v.playbackRate = r;
    setRateOpen(false);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  };

  const enterFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen().catch(() => {});
  };

  const onSurfaceClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      enterFullscreen();
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      togglePlay();
    }, 240);
  };

  useEffect(() => () => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  const handleSubtitleFile = (file) => {
    if (!file || !videoRef.current) return;
    const v = videoRef.current;
    [...v.querySelectorAll('track')].forEach((t) => t.remove());
    const url = URL.createObjectURL(file);
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = file.name;
    track.srclang = 'en';
    track.default = true;
    track.src = url;
    v.appendChild(track);
    setSubtitleTrack(file.name);
    setShowSubsInput(false);
  };

  const seekBy = (delta) => {
    const v = videoRef.current;
    if (!v || !canControl) return;
    v.currentTime = Math.max(0, Math.min(duration || v.duration, v.currentTime + delta));
  };

  const pct = duration ? (time / duration) * 100 : 0;
  const currentRate = videoRef.current?.playbackRate || 1;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black group ${
        playing && !showControls ? 'cursor-none' : ''
      }`}
      style={{ isolation: 'isolate' }}
      onMouseMove={bumpActivity}
      onMouseLeave={onSurfaceLeave}
    >
      <video
        ref={videoRef}
        src={src}
        className="block w-full h-full object-contain bg-black"
        playsInline
        controls={false}
        preload="auto"
      />

      {/* Click-to-toggle / double-click-fullscreen overlay */}
      {!autoplayBlocked && (
        <button
          type="button"
          onClick={onSurfaceClick}
          aria-label={playing ? 'Pause' : 'Play'}
          className="absolute inset-0 z-0 bg-transparent cursor-default"
        />
      )}

      {/* Autoplay blocked overlay */}
      {autoplayBlocked && (
        <button
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = false;
            v.play().catch(() => {});
            onResolveAutoplay?.();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10"
        >
          <div className="text-center">
            <div className="eyebrow">Browser is blocking autoplay</div>
            <div className="display text-3xl text-fg italic mt-1">
              Tap to begin
            </div>
          </div>
        </button>
      )}

      {/* Muted hint */}
      {muted && !autoplayBlocked && playing && (
        <button
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = false;
          }}
          className="absolute top-3 left-3 pill z-10 hover:bg-accent hover:text-white"
        >
          <Icon name="muted" size={13} />
          Sound off · tap for audio
        </button>
      )}

      {/* Lock badge for non-controllers */}
      {!canControl && (
        <div className="absolute top-3 right-3 pill z-10">
          <Icon name={isHost ? 'crown' : 'lock'} size={11} />
          {isHost ? 'host' : 'spectator · host controls'}
        </div>
      )}

      {/* control bar */}
      <div
        onMouseEnter={() => setControlsHover(true)}
        onMouseLeave={() => setControlsHover(false)}
        className={`absolute left-0 right-0 bottom-0 px-4 pt-12 pb-3 z-10 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4) 60%, transparent)',
        }}
      >
        {/* Scrubber */}
        <div
          ref={scrubRef}
          onClick={onScrub}
          onMouseMove={onScrubHover}
          onMouseLeave={onScrubLeave}
          className={`relative h-1.5 w-full bg-white/35 rounded-full group/scrub ${
            canControl ? 'cursor-pointer' : 'cursor-not-allowed'
          }`}
          aria-label="Scrub timeline"
        >
          {scrubHover && (
            <div
              className="absolute inset-y-0 bg-white/20 rounded-full pointer-events-none"
              style={{ left: `${pct}%`, width: `${Math.max(0, scrubHover.pct - pct)}%` }}
            />
          )}
          <div
            className="absolute inset-y-0 left-0 bg-accent rounded-full pointer-events-none"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 -ml-1.5 rounded-full bg-white shadow-[0_0_0_4px_rgba(124,124,245,0.45)] pointer-events-none"
            style={{ left: `${pct}%` }}
          />
          {scrubHover && (
            <div
              className="absolute bottom-full mb-2 -translate-x-1/2 pointer-events-none px-2 py-0.5 rounded bg-black/85 border border-white/10 mono text-[11px] text-white tabular-nums whitespace-nowrap"
              style={{ left: `${scrubHover.pct}%` }}
            >
              {formatTime(scrubHover.time)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 text-white gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CtrlBtn
              onClick={() => seekBy(-10)}
              disabled={!canControl}
              aria-label="Back 10s"
            >
              <Icon name="rewind" size={14} />
            </CtrlBtn>
            <CtrlBtn
              onClick={togglePlay}
              disabled={!canControl}
              accent
              aria-label={playing ? 'Pause' : 'Play'}
            >
              <Icon name={playing ? 'pause' : 'play'} size={16} />
            </CtrlBtn>
            <CtrlBtn
              onClick={() => seekBy(10)}
              disabled={!canControl}
              aria-label="Forward 10s"
            >
              <Icon name="skip" size={14} />
            </CtrlBtn>

            <div className="flex items-center gap-2 ml-2">
              <CtrlBtn
                onClick={toggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                <Icon name={muted || volume === 0 ? 'muted' : 'sound'} size={14} />
              </CtrlBtn>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = videoRef.current;
                  if (!v) return;
                  const next = Number(e.target.value);
                  v.volume = next;
                  v.muted = next === 0;
                }}
                className="w-20 accent-[#7c7cf5]"
                aria-label="Volume"
              />
            </div>

            <div className="mono text-[12px] text-white/90 ml-2 tabular-nums">
              <span>{formatTime(time)}</span>
              <span className="text-white/40 mx-1.5">/</span>
              <span className="text-white/60">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <CtrlBtn
                onClick={() => setRateOpen((v) => !v)}
                disabled={!canControl}
                aria-label="Playback speed"
              >
                <span className="mono text-[11px]">{currentRate}×</span>
              </CtrlBtn>
              {rateOpen && (
                <div className="absolute bottom-full right-0 mb-2 card py-1 min-w-[88px] bg-surface shadow-pop">
                  {RATES.map((r) => (
                    <button
                      key={r}
                      onClick={() => onChangeRate(r)}
                      className={`block w-full text-left px-3 py-1.5 mono text-[12px] hover:bg-surface-2 ${
                        r === currentRate ? 'text-accent' : 'text-fg'
                      }`}
                    >
                      {r}×
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <CtrlBtn
                onClick={() => setShowSubsInput((v) => !v)}
                aria-label="Subtitles"
              >
                <Icon name="cc" size={14} />
              </CtrlBtn>
              {showSubsInput && (
                <div className="absolute bottom-full right-0 mb-2 card px-3 py-2 w-64 bg-surface shadow-pop">
                  <div className="eyebrow mb-2">Load subtitles (.vtt)</div>
                  <input
                    type="file"
                    accept=".vtt"
                    onChange={(e) => handleSubtitleFile(e.target.files?.[0])}
                    className="text-[12px] text-fg"
                  />
                  {subtitleTrack && (
                    <div className="mt-2 mono text-[10px] text-fg-3 truncate">
                      Loaded: {subtitleTrack}
                    </div>
                  )}
                </div>
              )}
            </div>

            <CtrlBtn onClick={enterFullscreen} aria-label="Fullscreen">
              <Icon name="fullscreen" size={14} />
            </CtrlBtn>
          </div>
        </div>
      </div>

      {/* Right-edge emoji launcher — vertically centered pull-tab + panel.
          `visible` follows the same idle-hide rule as the control bar so
          the tab doesn't clutter the picture during quiet moments. */}
      {onSendReaction && (
        <ReactionLauncher
          onPick={onSendReaction}
          visible={showControls}
        />
      )}

      {/* Floating reaction stream — sits above the video but below the
          control bar's hover targets. pointer-events-none on the wrapper
          guarantees it never blocks playback clicks. */}
      <ReactionOverlay reactions={reactions} onExpire={onExpireReaction} />
    </div>
  );
}

function CtrlBtn({ children, disabled, accent, ...rest }) {
  const base =
    'inline-flex items-center justify-center rounded-full transition-colors';
  const size = accent ? 'w-11 h-11' : 'w-9 h-9';
  const palette = disabled
    ? 'opacity-30 cursor-not-allowed bg-white/8 border border-white/10 text-white/80'
    : accent
    ? 'bg-accent text-white hover:brightness-110 border border-accent shadow-[0_8px_24px_-12px_rgba(124,124,245,0.85)]'
    : 'bg-white/10 border border-white/16 text-white hover:bg-white/20';
  return (
    <button {...rest} disabled={disabled} className={`${base} ${size} ${palette}`}>
      {children}
    </button>
  );
}
