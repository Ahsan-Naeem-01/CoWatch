import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../utils/formatTime.js';

/**
 * Custom HTML5 video player with cinema-noir controls. Native controls are
 * hidden so we can present a coherent, theme-aware control bar (and so we can
 * disable controls for non-host viewers when allowAllControl is off).
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
}) {
  const [playing, setPlaying] = useState(roomPlayback?.isPlaying || false);
  const [time, setTime] = useState(roomPlayback?.currentTime || 0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rateOpen, setRateOpen] = useState(false);
  const [showSubsInput, setShowSubsInput] = useState(false);
  const [subtitleTrack, setSubtitleTrack] = useState(null);
  const containerRef = useRef(null);

  // Subscribe to native events to keep the UI honest.
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

  const handleSubtitleFile = (file) => {
    if (!file || !videoRef.current) return;
    // Remove old track elements
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

  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <div ref={containerRef} className="relative w-full bg-black aspect-video group">
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        playsInline
        controls={false}
        preload="metadata"
      />

      {/* Autoplay blocked overlay */}
      {autoplayBlocked && (
        <button
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            // The user gesture grants both unmute and play permissions.
            v.muted = false;
            v.play().catch(() => {});
            onResolveAutoplay?.();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-cinema text-bone-300/70">
              Browser is blocking autoplay
            </div>
            <div className="font-display text-3xl text-bone-50 italic mt-1">Tap to begin</div>
          </div>
        </button>
      )}

      {/* "Sound off" hint — appears while the video is muted (e.g. after the
          auto-mute fallback engaged) so the viewer knows audio is recoverable
          with a single click. Hidden once the user un-mutes. */}
      {muted && !autoplayBlocked && playing && (
        <button
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = false;
          }}
          className="absolute top-3 left-3 panel px-3 py-2 flex items-center gap-2 hover:bg-ember-500 hover:text-ink-900 transition-colors"
        >
          <MutedIcon />
          <span className="font-mono text-[10px] uppercase tracking-cinema">
            Sound off · tap for audio
          </span>
        </button>
      )}

      {/* control bar */}
      <div className="absolute left-0 right-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 px-4 pb-3 opacity-90 group-hover:opacity-100 transition-opacity">
        {/* Scrubber */}
        <div
          onClick={onScrub}
          className={`relative h-[3px] w-full bg-bone-300/15 ${
            canControl ? 'cursor-pointer' : 'cursor-not-allowed'
          }`}
          aria-label="Scrub timeline"
        >
          <div
            className="absolute inset-y-0 left-0 bg-ember-500"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 -ml-1.5 rounded-full bg-ember-500 shadow-glow-amber"
            style={{ left: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3 text-bone-100">
          <div className="flex items-center gap-3">
            <ControlButton onClick={togglePlay} disabled={!canControl} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <PauseIcon /> : <PlayIcon />}
            </ControlButton>

            <ControlButton onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted || volume === 0 ? <MutedIcon /> : <SoundIcon />}
            </ControlButton>

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
              className="w-20 accent-ember-500"
              aria-label="Volume"
            />

            <div className="font-mono text-xs tracking-wide text-bone-200 ml-3 tabular-nums">
              <span className="text-bone-50">{formatTime(time)}</span>
              <span className="text-bone-300/40 mx-1.5">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {file && (
              <span className="hidden md:inline font-mono text-[10px] uppercase tracking-cinema text-bone-300/60 mr-2 truncate max-w-[200px]">
                {file.name}
              </span>
            )}

            <div className="relative">
              <ControlButton
                onClick={() => setRateOpen((v) => !v)}
                disabled={!canControl}
                aria-label="Playback speed"
              >
                <span className="font-mono text-xs">{videoRef.current?.playbackRate || 1}x</span>
              </ControlButton>
              {rateOpen && (
                <div className="absolute bottom-full right-0 mb-2 panel py-1 min-w-[80px]">
                  {RATES.map((r) => (
                    <button
                      key={r}
                      onClick={() => onChangeRate(r)}
                      className="block w-full text-left px-3 py-1.5 font-mono text-xs hover:bg-bone-50/5 text-bone-100"
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <ControlButton onClick={() => setShowSubsInput((v) => !v)} aria-label="Subtitles">
                <span className="font-mono text-[10px] uppercase tracking-cinema">CC</span>
              </ControlButton>
              {showSubsInput && (
                <div className="absolute bottom-full right-0 mb-2 panel px-3 py-2 w-64">
                  <div className="font-mono text-[10px] uppercase tracking-cinema text-bone-300 mb-2">
                    Load subtitles (.vtt)
                  </div>
                  <input
                    type="file"
                    accept=".vtt"
                    onChange={(e) => handleSubtitleFile(e.target.files?.[0])}
                    className="text-xs text-bone-100"
                  />
                  {subtitleTrack && (
                    <div className="mt-2 font-mono text-[10px] text-bone-300/70 truncate">
                      Loaded: {subtitleTrack}
                    </div>
                  )}
                </div>
              )}
            </div>

            <ControlButton onClick={enterFullscreen} aria-label="Fullscreen">
              <FullscreenIcon />
            </ControlButton>
          </div>
        </div>
      </div>

      {/* Lock badge for non-controllers */}
      {!canControl && (
        <div className="absolute top-3 right-3 font-mono text-[10px] uppercase tracking-cinema text-bone-300/80 bg-ink-900/70 border border-bone-300/20 px-2 py-1">
          {isHost ? 'host' : 'spectator · host controls'}
        </div>
      )}
    </div>
  );
}

function ControlButton({ children, ...rest }) {
  return (
    <button
      {...rest}
      className={`w-9 h-9 flex items-center justify-center border border-bone-300/15 bg-ink-900/40 text-bone-100 hover:bg-ember-500 hover:text-ink-900 hover:border-ember-500 transition-colors disabled:opacity-30 disabled:hover:bg-ink-900/40 disabled:hover:text-bone-100 disabled:hover:border-bone-300/15 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

// Tiny inline icons (keep SVG embedded to avoid icon library bloat)
const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.5v11l9-5.5z"/></svg>
);
const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="3" y="2" width="3" height="10"/><rect x="8" y="2" width="3" height="10"/></svg>
);
const SoundIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5v4h2l3 2V3L4 5H2z"/><path d="M9.5 4a4 4 0 010 6"/></svg>
);
const MutedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5v4h2l3 2V3L4 5H2z"/><path d="M9 5l4 4M13 5l-4 4"/></svg>
);
const FullscreenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"/></svg>
);
