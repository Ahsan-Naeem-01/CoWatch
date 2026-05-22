import { useEffect, useState } from 'react';

export default function RoomHeader({ room, isHost, connected, onCopy, onLeave, onToggleAllowAll }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - room.createdAt) / 1000));
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <header className="px-6 lg:px-10 pt-6 pb-4">
      <div className="grid grid-cols-12 gap-4 items-end">
        {/* Slate */}
        <div className="col-span-12 lg:col-span-7">
          <div className="flex items-center gap-3 text-bone-300/70 font-mono text-[10px] uppercase tracking-cinema">
            <span className="block w-2 h-2 rounded-full bg-crimson-500 animate-pulse-soft" />
            <span>REC</span>
            <span className="text-bone-300/40">·</span>
            <span>SCREENING IN PROGRESS</span>
            <span className="text-bone-300/40">·</span>
            <span className="text-ember-400">{hh}:{mm}:{ss}</span>
          </div>
          <h1 className="font-display text-3xl lg:text-5xl text-bone-50 mt-1 leading-tight italic">
            {room.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-cinema text-bone-300/70">
            <span className={connected ? 'text-ember-400' : 'text-crimson-400'}>
              ● {connected ? 'LINK STABLE' : 'RECONNECTING…'}
            </span>
            <span>· {room.users.length} viewer{room.users.length === 1 ? '' : 's'}</span>
            <span>·</span>
            <span>{room.allowAllControl ? 'Open seating · all may control' : 'Host-only controls'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-12 lg:col-span-5 flex flex-wrap items-center justify-end gap-2">
          {isHost && (
            <button onClick={onToggleAllowAll} className="btn-ghost" title="Toggle who can control playback">
              {room.allowAllControl ? 'Restrict to host' : 'Allow all to control'}
            </button>
          )}
          <button onClick={onCopy} className="btn-ghost">
            Copy invite link
          </button>
          <button onClick={onLeave} className="btn-danger">
            Leave room
          </button>
        </div>
      </div>
      <div className="hairline mt-6" />
    </header>
  );
}
