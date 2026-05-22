import { useApp } from '../context/AppContext.jsx';
import { Icon } from './Icon.jsx';

const KIND = {
  info: {
    icon: 'sync',
    badge: 'bg-surface-2 text-fg-2 border-line-strong',
    label: 'INFO',
  },
  success: {
    icon: 'check',
    badge:
      'bg-[color-mix(in_oklch,#5dd6a3_18%,transparent)] text-success border-[color-mix(in_oklch,#5dd6a3_45%,transparent)]',
    label: 'OK',
  },
  warn: {
    icon: 'sparkle',
    badge:
      'bg-[color-mix(in_oklch,#f5a524_18%,transparent)] text-[#f5a524] border-[color-mix(in_oklch,#f5a524_45%,transparent)]',
    label: 'WARN',
  },
  error: {
    icon: 'sparkle',
    badge:
      'bg-[color-mix(in_oklch,#f06c8a_18%,transparent)] text-danger border-[color-mix(in_oklch,#f06c8a_45%,transparent)]',
    label: 'ERR',
  },
};

export default function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const k = KIND[t.kind] || KIND.info;
        return (
          <button
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className="text-left card overflow-hidden px-4 py-3 fade-in group hover:bg-surface-2 transition-colors backdrop-blur"
            style={{
              background:
                'color-mix(in oklch, var(--surface) 92%, transparent)',
            }}
          >
            <div className="flex items-baseline justify-between gap-4">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border mono text-[10px] tracking-cinema uppercase ${k.badge}`}
              >
                <Icon name={k.icon} size={10} />
                {k.label}
              </span>
              <span className="mono text-[9px] uppercase tracking-cinema text-fg-3 opacity-50 group-hover:opacity-100 transition-opacity">
                dismiss
              </span>
            </div>
            {t.title && (
              <div className="display text-[18px] text-fg mt-1.5">
                {t.title}
              </div>
            )}
            {t.body && (
              <div className="text-[13px] text-fg-2 mt-0.5 leading-snug">
                {t.body}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
