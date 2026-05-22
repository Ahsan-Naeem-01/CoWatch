import { useEffect, useRef, useState } from 'react';

export default function ChatPanel({ messages, onSend, selfId }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText('');
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={listRef} className="flex-1 overflow-auto thin-scroll px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center mt-12">
            <div className="font-display text-2xl text-bone-50/60 italic">No whispers yet.</div>
            <div className="font-mono text-[10px] uppercase tracking-cinema text-bone-300/50 mt-2">
              Be the first to break the silence
            </div>
          </div>
        )}
        {messages.map((m) => {
          const self = m.userId === selfId;
          return (
            <div key={m.id} className={`flex flex-col ${self ? 'items-end' : 'items-start'}`}>
              <div className="font-mono text-[9px] uppercase tracking-cinema text-bone-300/60 mb-0.5">
                {self ? 'you' : m.userName} ·{' '}
                {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div
                className={`max-w-[85%] px-3 py-2 text-sm leading-snug ${
                  self
                    ? 'bg-ember-500 text-ink-900'
                    : 'bg-ink-700/70 border border-bone-300/10 text-bone-100'
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="border-t border-bone-300/10 px-3 py-2 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Send a whisper…"
          className="flex-1 bg-transparent text-bone-50 placeholder-bone-300/40 font-mono text-sm outline-none py-2"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="font-mono text-[10px] uppercase tracking-cinema text-ember-400 hover:text-ember-300 disabled:opacity-30"
        >
          Send →
        </button>
      </form>
    </div>
  );
}
