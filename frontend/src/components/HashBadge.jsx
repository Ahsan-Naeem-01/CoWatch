import { formatBytes, shortHash } from '../utils/formatTime.js';

export default function HashBadge({ roomSignature, userSignature, matches, mismatch }) {
  if (!userSignature) {
    return (
      <div className="inline-flex items-center gap-2 panel px-3 py-2">
        <span className="block w-2 h-2 rounded-full bg-bone-300/40" />
        <span className="font-mono text-[10px] uppercase tracking-cinema text-bone-300/70">
          NO REEL LOADED
        </span>
      </div>
    );
  }

  const ok = matches === true;
  const bad = matches === false || !!mismatch;
  const color = ok
    ? 'text-bone-50'
    : bad
      ? 'text-crimson-400'
      : 'text-ember-400';
  const dot = ok ? 'bg-bone-50' : bad ? 'bg-crimson-400' : 'bg-ember-400';
  const label = ok ? 'FILE MATCH' : bad ? 'FILE MISMATCH' : 'AWAITING ROOM REFERENCE';

  return (
    <div className="inline-flex items-center gap-2 panel px-3 py-2">
      <span className={`block w-2 h-2 rounded-full ${dot}`} />
      <span className={`font-mono text-[10px] uppercase tracking-cinema ${color}`}>
        {label}
      </span>
      <span className="font-mono text-[10px] tracking-cinema text-bone-300/60">
        {shortHash(userSignature.hash)} · {formatBytes(userSignature.size)}
      </span>
    </div>
  );
}
