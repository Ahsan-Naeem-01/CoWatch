export default function SyncIndicator({ connected, driftMs, syncing }) {
  const status = !connected
    ? { color: 'text-crimson-400', dot: 'bg-crimson-400', label: 'LINK LOST' }
    : syncing
      ? { color: 'text-ember-400', dot: 'bg-ember-400 animate-pulse-soft', label: 'CORRECTING DRIFT' }
      : Math.abs(driftMs) > 250
        ? { color: 'text-ember-400', dot: 'bg-ember-400', label: 'DRIFT DETECTED' }
        : { color: 'text-bone-50', dot: 'bg-bone-50', label: 'IN SYNC' };

  return (
    <div className="inline-flex items-center gap-2 panel px-3 py-2">
      <span className={`block w-2 h-2 rounded-full ${status.dot}`} />
      <span className={`font-mono text-[10px] uppercase tracking-cinema ${status.color}`}>
        {status.label}
      </span>
      <span className="font-mono text-[10px] tracking-cinema text-bone-300/60 ml-1 tabular-nums">
        Δ {driftMs >= 0 ? '+' : ''}
        {driftMs} ms
      </span>
    </div>
  );
}
