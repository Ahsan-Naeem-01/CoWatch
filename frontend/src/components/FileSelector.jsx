import { useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

export default function FileSelector({ onPick, compact = false }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`relative w-full h-full ${
        compact ? 'aspect-video' : ''
      } flex items-center justify-center transition-colors`}
      style={{
        background:
          'radial-gradient(ellipse at center, #11151f 0%, #000 70%), repeating-linear-gradient(45deg, rgba(255,255,255,0.012) 0 8px, transparent 8px 16px)',
      }}
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

      <div className="text-center px-6 max-w-[520px] flex flex-col items-center gap-5">
        <button
          onClick={() => inputRef.current?.click()}
          className={`group flex flex-col items-center gap-3 px-10 py-9 rounded-2xl transition-colors ${
            dragOver
              ? 'bg-white/[0.05] border-accent'
              : 'bg-white/[0.02] border-white/[0.18] hover:border-accent hover:bg-white/[0.04]'
          } border-2 border-dashed cursor-pointer`}
        >
          <span className="w-12 h-12 rounded-full bg-accent-soft border border-accent text-accent flex items-center justify-center">
            <Icon name="upload" size={22} />
          </span>
          <span className="display text-[22px] text-white/95">
            Drop your video here
          </span>
          <span className="text-[12px] text-white/55">
            or click to choose · MP4, MOV, WebM
          </span>
        </button>

        <div className="mono text-[10px] tracking-cinema uppercase text-white/45">
          Everyone in the room loads the same file
        </div>

        {dragOver && (
          <div className="mono text-[11px] tracking-cinema uppercase text-accent">
            Release to load
          </div>
        )}
      </div>
    </div>
  );
}
