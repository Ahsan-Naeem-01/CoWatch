import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

/**
 * Two render modes:
 *   - default (desktop): renders inside its own .card with header + composer
 *   - embed (mobile tab content): skips the outer card, just body + composer
 */
export default function ChatPanel({
  messages,
  onSend,
  selfId,
  users = [],
  embed = false,
}) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const userById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users]
  );

  const submit = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText('');
  };

  const visibleCount = messages.length;

  const body = (
    <>
      <div
        ref={listRef}
        className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-4 min-h-0"
      >
        {messages.length === 0 && (
          <div className="text-center my-auto py-8">
            <Icon
              name="chat"
              size={22}
              className="text-fg-3 mx-auto mb-3"
            />
            <div className="display text-[22px] text-fg-2 italic">
              No whispers yet.
            </div>
            <div className="eyebrow mt-2">
              Be the first to break the silence
            </div>
          </div>
        )}
        {messages.map((m) => {
          const self = m.userId === selfId;
          const userIdx = users.findIndex((u) => u.id === m.userId);
          const avIdx = userIdx >= 0 ? userIdx % 6 : 0;
          const u = userById[m.userId] || { name: m.userName || 'someone' };
          const ts = new Date(m.at);
          const tsLabel = ts.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          return (
            <div
              key={m.id}
              className={`grid grid-cols-[28px_1fr] gap-2.5 items-start ${
                self ? 'opacity-100' : ''
              }`}
            >
              <span
                className={`av av-${avIdx}`}
                style={{ width: 28, height: 28, fontSize: 10 }}
              >
                {(u.name || '?').slice(0, 1).toUpperCase()}
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold text-fg">
                    {u.name}
                    {self && (
                      <span className="text-fg-3 font-normal"> (you)</span>
                    )}
                  </span>
                  <span className="mono text-[10px] text-fg-3 tracking-wide">
                    {tsLabel}
                  </span>
                </div>
                <div
                  className={`text-[14px] leading-snug break-words ${
                    self ? 'text-fg' : 'text-fg-2'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={submit}
        className="flex items-center gap-2 px-3.5 py-3 border-t border-line bg-bg-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Say something to the room…"
          className="flex-1 h-10 rounded-full border border-line bg-surface-2 px-4 text-[14px] text-fg placeholder:text-fg-3 outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Send"
          className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
        >
          <Icon name="send" size={14} />
        </button>
      </form>
    </>
  );

  if (embed) {
    return <div className="flex flex-col h-full min-h-0">{body}</div>;
  }

  return (
    <div className="card flex flex-col min-h-0 h-full overflow-hidden">
      <div className="card-hd">
        <span className="title">Chat</span>
        <span className="meta">{visibleCount} messages</span>
      </div>
      {body}
    </div>
  );
}
