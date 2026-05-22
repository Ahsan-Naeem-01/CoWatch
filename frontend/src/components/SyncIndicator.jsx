/**
 * Compact connection-status badge. (The room's top sync pill carries the
 * primary status; this is used in the footer / mobile views where space is
 * tight.)
 */
export default function SyncIndicator({ connected }) {
  return (
    <span className={`pill ${connected ? 'accent' : 'danger'}`}>
      <span className="dot" />
      {connected ? 'Link stable' : 'Link lost'}
    </span>
  );
}
