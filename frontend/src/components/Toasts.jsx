import { useApp } from '../context/AppContext.jsx';

const COLORS = {
  info: 'border-bone-300/30 text-bone-100',
  success: 'border-ember-500/60 text-ember-400',
  warn: 'border-crimson-400/60 text-crimson-400',
  error: 'border-crimson-500/80 text-crimson-400',
};

export default function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={`text-left panel border ${COLORS[t.kind]} px-4 py-3 animate-rise group`}
        >
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-mono text-[10px] uppercase tracking-cinema opacity-70">
              {t.kind}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-cinema opacity-40 group-hover:opacity-70">
              dismiss
            </span>
          </div>
          {t.title && (
            <div className="font-display text-base text-bone-50 mt-1">{t.title}</div>
          )}
          {t.body && <div className="text-sm text-bone-200 mt-0.5">{t.body}</div>}
        </button>
      ))}
    </div>
  );
}
