import { useRef, useState } from 'react';
import { formatBytes, shortHash } from '../utils/formatTime.js';

export default function FileSelector({ onPick, hashing, progress, roomSignature }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const pct = Math.min(100, Math.max(0, Math.round((progress || 0) * 100)));

  return (
    <div
      className={`relative aspect-video w-full flex items-center justify-center transition-colors ${
        dragOver ? 'bg-ember-500/5' : 'bg-ink-900/60'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer?.files?.[0];
        if (f) onPick(f);
      }}
    >
      {/* corner brackets — film slate aesthetic */}
      <Bracket pos="tl" />
      <Bracket pos="tr" />
      <Bracket pos="bl" />
      <Bracket pos="br" />

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />

      <div className="text-center px-6 max-w-xl">
        <div className="font-mono text-[10px] uppercase tracking-cinema text-bone-300/70 mb-3">
          Load your local reel
        </div>
        <div className="font-display text-3xl text-bone-50 italic">
          {hashing ? 'Reading the print…' : 'Pick a video file from your drive'}
        </div>
        <p className="mt-3 text-sm text-bone-200/70">
          Nothing leaves your machine. We only share the SHA-256 fingerprint so
          everyone can be sure they&apos;re watching the same cut.
        </p>

        {!hashing ? (
          <button onClick={() => inputRef.current?.click()} className="btn-primary mt-7">
            Choose a file
            <span aria-hidden>→</span>
          </button>
        ) : (
          <div className="mt-8">
            <div className="h-[3px] w-full bg-ink-700 overflow-hidden">
              <div
                className="h-full bg-ember-500 transition-[width] duration-150 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 font-mono text-[10px] tracking-cinema uppercase text-bone-300/70">
              Hashing · {pct}%
            </div>
          </div>
        )}

        {roomSignature && (
          <div className="mt-6 font-mono text-[10px] tracking-cinema uppercase text-bone-300/60">
            Room is expecting: <span className="text-ember-400">{shortHash(roomSignature.hash)}</span>
            <span className="text-bone-300/40"> · {formatBytes(roomSignature.size)}</span>
          </div>
        )}

        {dragOver && (
          <div className="mt-6 font-mono text-[10px] tracking-cinema uppercase text-ember-400">
            Release to load
          </div>
        )}
      </div>

      {/* film perforations */}
      <div className="absolute top-0 left-0 bottom-0 w-3 reel-strip" />
      <div className="absolute top-0 right-0 bottom-0 w-3 reel-strip" />
    </div>
  );
}

function Bracket({ pos }) {
  const map = {
    tl: 'top-3 left-5',
    tr: 'top-3 right-5 rotate-90',
    bl: 'bottom-3 left-5 -rotate-90',
    br: 'bottom-3 right-5 rotate-180',
  };
  return (
    <span
      aria-hidden
      className={`absolute ${map[pos]} text-ember-500/80`}
      style={{ width: 22, height: 22 }}
    >
      <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 8V2h6" />
      </svg>
    </span>
  );
}
