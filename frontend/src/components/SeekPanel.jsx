import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

/**
 * Seek launcher — mirror image of <ReactionLauncher>.
 *
 *  - Mounts on the LEFT edge of the video, vertically centered, as a small
 *    arrow tab. Clicking the tab slides a panel of quick-jump buttons out to
 *    its right; clicking again (or outside / Esc) closes it. The arrow flips
 *    direction to telegraph the action.
 *  - Each button jumps the playhead forward by a fixed amount via `onSeek`.
 */
const SEEK_OPTIONS = [
  { label: '+5s', delta: 5 },
  { label: '+10s', delta: 10 },
  { label: '+1m', delta: 60 },
  { label: '+1.4m', delta: 84 },
  { label: '+1.5m', delta: 90 },
  { label: '+2m', delta: 120 },
];

const isTypingTarget = () => {
  const el = document.activeElement;
  const tag = el?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable;
};

export function SeekLauncher({ onSeek, disabled, visible = true }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Global shortcuts: `x`/`X` toggles the panel; while it's open, the number
  // keys (1, 2, 3…) fire the matching seek option. Ignored while typing.
  useEffect(() => {
    const onKey = (e) => {
      if (disabled || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget()) return;
      if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (!open) return;
      if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (idx < SEEK_OPTIONS.length) {
          e.preventDefault();
          onSeek?.(SEEK_OPTIONS[idx].delta);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, disabled, onSeek]);

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

  // Hidden alongside the rest of the player chrome when idle, but stays put
  // if the panel is currently open so it doesn't snap closed under the cursor.
  const showAssembly = visible || open;

  return (
    <div
      ref={wrapRef}
      className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center transition-opacity duration-200 ${
        showAssembly ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Left-edge arrow tab — pull-tab shape, rounded only on the right. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label={open ? 'Close seek panel' : 'Open seek panel'}
        aria-expanded={open}
        className={`flex items-center justify-center h-14 w-7 rounded-r-lg border border-l-0 transition-colors ${
          disabled
            ? 'opacity-30 cursor-not-allowed bg-white/8 border-white/10 text-white/80'
            : open
            ? 'bg-accent border-accent text-white'
            : 'bg-black/70 border-white/15 text-white hover:bg-black/85'
        }`}
      >
        <Icon name={open ? 'arrow_left' : 'arrow_right'} size={16} />
      </button>

      {/* Panel slides out to the right of the arrow tab. Mounted after the
          tab in the DOM so flexbox lays them out as [tab][panel]. */}
      {open && (
        <div
          role="menu"
          aria-label="Quick seek"
          className="ml-1 flex flex-col gap-1 p-1.5 rounded-2xl bg-black/85 border border-white/15 backdrop-blur-md shadow-pop reaction-panel-enter"
        >
          {SEEK_OPTIONS.map((o, i) => (
            <button
              key={o.label}
              type="button"
              role="menuitem"
              onClick={() => onSeek?.(o.delta)}
              className="min-w-[64px] h-9 pl-1.5 pr-2 inline-flex items-center gap-1.5 rounded-full hover:bg-white/15 active:scale-90 transition-transform mono text-[13px] text-white leading-none"
              aria-label={`Seek forward ${o.label} (key ${i + 1})`}
            >
              <span className="text-[11px] text-white/50 w-3 text-center">
                {i + 1}
              </span>
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
