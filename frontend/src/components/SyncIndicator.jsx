export default function SyncIndicator({ connected }) {
  const status = connected
    ? { color: 'text-bone-50', dot: 'bg-bone-50', label: 'LINK STABLE' }
    : { color: 'text-crimson-400', dot: 'bg-crimson-400', label: 'LINK LOST' };

  return (
    <div className="inline-flex items-center gap-2 panel px-3 py-2">
      <span className={`block w-2 h-2 rounded-full ${status.dot}`} />
      <span className={`font-mono text-[10px] uppercase tracking-cinema ${status.color}`}>
        {status.label}
      </span>
    </div>
  );
}
