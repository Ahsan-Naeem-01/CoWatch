import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

/**
 * Emoji reactions — Instagram-Live style.
 *
 *  - <ReactionLauncher> mounts on the right edge of the video, vertically
 *    centered, as a small arrow tab. Clicking the tab slides an emoji panel
 *    out to its left; clicking again (or outside / Esc) closes it. The arrow
 *    flips direction to telegraph the action.
 *  - <ReactionOverlay> renders the floating, rising emojis on top of the
 *    video. It is pointer-events-none so it never intercepts playback clicks.
 *
 * The set is intentionally short so the panel stays compact and the server's
 * allow-list (see backend/socket/socketHandler.js) can validate against the
 * same list. Keep these in sync.
 */
export const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👏', '🎉', '👀', '🙈', '💀', '🤬', '😪', '😭'];

// Keyboard shortcut label for the emoji at position `i`: 1-9 for the first
// nine, then a, b, c… for the rest.
const shortcutLabel = (i) =>
  i < 9 ? String(i + 1) : String.fromCharCode(97 + (i - 9));

// Map a pressed key back to an emoji index, or -1 if it isn't a shortcut.
const indexFromKey = (key) => {
  if (/^[1-9]$/.test(key)) return Number(key) - 1;
  if (/^[a-z]$/.test(key)) return 9 + (key.charCodeAt(0) - 97);
  return -1;
};

const isTypingTarget = () => {
  const el = document.activeElement;
  const tag = el?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable;
};

export function ReactionLauncher({ onPick, disabled, visible = true }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handlePick = (emoji) => {
    onPick?.(emoji);
    // Leave the panel open so users can fire a few in a row without
    // re-clicking the toggle — matches Insta Live's tap-burst feel.
  };

  // Global shortcuts: `s`/`S` toggles the panel; while it's open, the
  // per-emoji keys (1-9, a, b, c…) fire that emoji. Ignored while typing.
  useEffect(() => {
    const onKey = (e) => {
      if (disabled || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget()) return;
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (!open) return;
      const idx = indexFromKey(e.key.toLowerCase());
      if (idx >= 0 && idx < REACTION_EMOJIS.length) {
        e.preventDefault();
        onPick?.(REACTION_EMOJIS[idx]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, disabled, onPick]);

  // The whole assembly is hidden alongside the rest of the player chrome
  // when the user is idle, but stays put if the panel is currently open
  // (so it doesn't snap closed under the cursor).
  const showAssembly = visible || open;

  return (
    <div
      ref={wrapRef}
      className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center transition-opacity duration-200 ${
        showAssembly ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Panel slides out to the left of the arrow tab. Mounted before the
          tab in the DOM so flexbox lays them out as [panel][tab]. */}
      {open && (
        <div
          role="menu"
          aria-label="Emoji reactions"
          className="mr-1 flex flex-col gap-1 p-1.5 rounded-2xl bg-black/85 border border-white/15 backdrop-blur-md shadow-pop reaction-panel-enter"
        >
          {REACTION_EMOJIS.map((e, i) => (
            <button
              key={e}
              type="button"
              role="menuitem"
              onClick={() => handlePick(e)}
              className="h-9 pl-1.5 pr-2 inline-flex items-center gap-1.5 rounded-full hover:bg-white/15 active:scale-90 transition-transform leading-none"
              aria-label={`React with ${e} (key ${shortcutLabel(i)})`}
            >
              <span className="mono text-[11px] text-white/50 w-3 text-center">
                {shortcutLabel(i)}
              </span>
              <span className="emoji-noto text-[18px]">{e}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right-edge arrow tab — pull-tab shape, rounded only on the left. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label={open ? 'Close emoji reactions' : 'Open emoji reactions'}
        aria-expanded={open}
        className={`flex items-center justify-center h-14 w-7 rounded-l-lg border border-r-0 transition-colors ${
          disabled
            ? 'opacity-30 cursor-not-allowed bg-white/8 border-white/10 text-white/80'
            : open
            ? 'bg-accent border-accent text-white'
            : 'bg-black/70 border-white/15 text-white hover:bg-black/85'
        }`}
      >
        <Icon name={open ? 'arrow_right' : 'arrow_left'} size={16} />
      </button>
    </div>
  );
}

/**
 * Renders transient bursts of floating emojis spanning the full bottom of the
 * video. Each entry carries its own start X (percent), drift, delay, duration,
 * and scale so a burst looks like organic confetti rather than a uniform row.
 */
export function ReactionOverlay({ reactions, onExpire }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 bottom-16 top-0 z-20 pointer-events-none select-none overflow-hidden"
    >
      {reactions.map((r) => (
        <span
          key={r.id}
          onAnimationEnd={() => onExpire?.(r.id)}
          className="reaction-float emoji-noto absolute bottom-0 leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]"
          style={{
            left: `${r.x}%`,
            fontSize: `${r.size}px`,
            animationDelay: `${r.delay}ms`,
            animationDuration: `${r.duration}ms`,
            '--x': `${r.drift}px`,
            '--rot': `${r.rot}deg`,
          }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}

// Spawn a burst of N copies of the same emoji, each with its own randomized
// start X across the full bottom, drift, scale, rotation, and animation timing
// so a single tap produces a confetti-like rise instead of a single float.
export function makeReactionBurst(emoji, count = 7) {
  const base = Date.now();
  const burst = [];
  for (let i = 0; i < count; i += 1) {
    burst.push({
      id: `${base}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      emoji,
      x: Math.random() * 92 + 4,          // 4%..96% across the bottom
      drift: ((Math.random() * 120 - 60) | 0), // -60..60 px sideways
      rot: ((Math.random() * 40 - 20) | 0),    // -20..20 deg final rotation
      size: 24 + ((Math.random() * 18) | 0),   // 24..42 px
      delay: (Math.random() * 220) | 0,        // stagger 0..220ms
      duration: 2400 + ((Math.random() * 1000) | 0), // 2.4..3.4s
    });
  }
  return burst;
}
