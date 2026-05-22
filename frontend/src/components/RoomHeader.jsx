import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import Brand from './Brand.jsx';

export default function RoomHeader({
  room,
  isHost,
  connected,
  onCopy,
  onLeave,
  onToggleAllowAll,
}) {
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - room.createdAt) / 1000));
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <header className="border-b border-line bg-bg/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 lg:px-6 py-3">
        {/* Left — brand + room meta */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="btn-icon hidden lg:inline-flex"
            onClick={onLeave}
            title="Leave room"
            aria-label="Leave room"
          >
            <Icon name="arrow_left" size={16} />
          </button>
          <Brand compact />
          <div className="flex flex-col min-w-0">
            <span className="eyebrow text-[10px]">
              Watching · {room.name}
            </span>
            <span className="display text-[20px] leading-none truncate max-w-[260px] lg:max-w-[420px]">
              {room.name}
            </span>
          </div>
        </div>

        {/* Center — sync pill */}
        <div className="flex items-center gap-2">
          <span
            className={`pill ${connected ? 'accent' : 'danger'}`}
            title={connected ? 'Sync stream stable' : 'Reconnecting…'}
          >
            <span className="dot" />
            <span>{connected ? 'In sync' : 'Reconnecting…'}</span>
          </span>
          <span className="mono text-[11px] tracking-cinema text-fg-3 hidden md:inline">
            {hh}:{mm}:{ss}
          </span>
        </div>

        {/* Right — actions */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {isHost && (
            <button
              onClick={onToggleAllowAll}
              className="btn btn-ghost text-[13px] hidden md:inline-flex"
              title="Toggle who can control playback"
            >
              <Icon
                name={room.allowAllControl ? 'users' : 'lock'}
                size={14}
              />
              <span className="hidden lg:inline">
                {room.allowAllControl ? 'Open seating' : 'Host-only'}
              </span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="btn btn-ghost text-[13px]"
            title="Copy invite link"
          >
            <Icon name={copied ? 'check' : 'copy'} size={14} />
            <span className="mono text-[12px] tracking-wide hidden sm:inline">
              r/{room.name}
            </span>
          </button>
          <button
            onClick={onLeave}
            className="btn btn-danger text-[13px]"
            title="Leave"
          >
            <Icon name="exit" size={14} />
            <span className="hidden md:inline">Leave</span>
          </button>
        </div>
      </div>
    </header>
  );
}
