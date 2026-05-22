import { Icon } from './Icon.jsx';

const KIND_ICON = {
  join: 'users',
  leave: 'door',
  play: 'play',
  pause: 'pause',
  seek: 'sync',
  rate: 'settings',
  system: 'sparkle',
};

const KIND_COLOR = {
  join: 'text-success border-success/30',
  leave: 'text-danger border-danger/30',
  play: 'text-success border-success/30',
  pause: 'text-accent border-accent/30',
  seek: 'text-fg-2 border-line-strong',
  rate: 'text-fg-2 border-line-strong',
  system: 'text-fg-2 border-line-strong',
};

function relativeTime(at) {
  const diff = Math.floor((Date.now() - at) / 1000);
  if (diff < 5) return 'now';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export default function ActivityLog({ room, embed = false }) {
  const items = [...(room.activity || [])].reverse();

  const body = (
    <div className="flex-1 overflow-auto py-1 min-h-0">
      {items.length === 0 && (
        <div className="text-center py-12">
          <Icon
            name="activity"
            size={20}
            className="text-fg-3 mx-auto mb-2"
          />
          <div className="mono text-[11px] tracking-cinema uppercase text-fg-3">
            No events recorded yet
          </div>
        </div>
      )}
      {items.map((a, idx) => (
        <div
          key={`${a.at}-${idx}`}
          className="grid grid-cols-[28px_1fr_auto] gap-3 items-center px-4 py-2.5"
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center bg-surface-2 border ${
              KIND_COLOR[a.kind] || 'text-fg-2 border-line'
            }`}
          >
            <Icon name={KIND_ICON[a.kind] || 'sync'} size={12} />
          </span>
          <div className="text-[13px] text-fg-2 leading-snug truncate">
            {a.message}
          </div>
          <div className="mono text-[10px] tracking-wide text-fg-3">
            {relativeTime(a.at)}
          </div>
        </div>
      ))}
    </div>
  );

  if (embed) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="card-hd">
          <span className="title">Activity</span>
          <span className="meta">{items.length} events</span>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="card flex flex-col min-h-0 h-full overflow-hidden">
      <div className="card-hd">
        <span className="title">Activity</span>
        <span className="meta">{items.length} events</span>
      </div>
      {body}
    </div>
  );
}
