const KIND_COLOR = {
  join: 'text-ember-400',
  leave: 'text-bone-300/70',
  play: 'text-bone-50',
  pause: 'text-bone-50',
  seek: 'text-bone-50',
  rate: 'text-bone-50',
  system: 'text-crimson-400',
};

export default function ActivityLog({ room }) {
  const items = [...(room.activity || [])].reverse();
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-bone-300/10 font-mono text-[10px] uppercase tracking-cinema text-bone-300">
        Reel log
      </div>
      <ul className="flex-1 overflow-auto thin-scroll px-4 py-3 space-y-2">
        {items.length === 0 && (
          <li className="font-mono text-xs text-bone-300/50 italic">No events recorded yet.</li>
        )}
        {items.map((a, idx) => (
          <li key={`${a.at}-${idx}`} className="flex items-start gap-3">
            <span className="font-mono text-[10px] tabular-nums text-bone-300/50 mt-0.5 min-w-[44px]">
              {new Date(a.at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })}
            </span>
            <span className={`text-sm leading-snug ${KIND_COLOR[a.kind] || 'text-bone-100'}`}>
              {a.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
