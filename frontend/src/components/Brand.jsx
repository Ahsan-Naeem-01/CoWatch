export default function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="brand-mark" />
      {!compact && (
        <div className="brand-name">
          <b>Co</b>
          <i>Watch</i>
        </div>
      )}
    </div>
  );
}
