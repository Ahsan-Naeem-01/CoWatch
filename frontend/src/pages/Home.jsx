import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';
import { useApp } from '../context/AppContext.jsx';

const TAGLINES = [
  'Press play together.',
  'A projector for the whole room.',
  'One reel. Many seats.',
];

export default function Home() {
  const { socket, connected } = useSocket();
  const { userName, setUserName, pushToast } = useApp();
  const navigate = useNavigate();

  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(userName || '');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ rooms: 0, users: 0 });
  const [tagline, setTagline] = useState(TAGLINES[0]);

  useEffect(() => {
    const i = setInterval(() => {
      setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
    }, 5200);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const url = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000') + '/api/rooms/count';
    let stopped = false;
    const refresh = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        if (!stopped) setStats(json);
      } catch {
        /* offline */
      }
    };
    refresh();
    const i = setInterval(refresh, 6000);
    return () => {
      stopped = true;
      clearInterval(i);
    };
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const safeName = name.trim() || 'Anonymous';
    setUserName(safeName);
    if (!roomName.trim() || !password) {
      pushToast({ kind: 'warn', title: 'Missing fields', body: 'Room name and password are required.' });
      return;
    }
    setSubmitting(true);
    const event = mode === 'create' ? 'create-room' : 'join-room';
    socket.emit(event, { name: roomName.trim(), password, userName: safeName }, (resp) => {
      setSubmitting(false);
      if (resp?.error) {
        pushToast({ kind: 'error', title: 'Could not enter room', body: resp.error });
        return;
      }
      // Pass the joined room as initial state to avoid a refetch round-trip.
      navigate(`/room/${encodeURIComponent(roomName.trim())}`, {
        state: { initialRoom: resp.room, selfId: resp.selfId, password },
      });
    });
  };

  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      <Header connected={connected} />

      <section className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 px-6 lg:px-16 py-12 lg:py-20 max-w-[1400px] mx-auto w-full">
        {/* Left: Marquee */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-6 animate-rise">
            <span className="block w-2 h-2 rounded-full bg-crimson-500 animate-pulse-soft" />
            <span className="font-mono text-[10px] uppercase tracking-cinema text-bone-300">
              REEL ONE · TAKE {String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')} · LIVE
            </span>
          </div>

          <h1 className="font-display font-light leading-[0.85] text-bone-50 animate-rise">
            <span className="block text-[clamp(3.5rem,11vw,9rem)] italic">CoWatch</span>
            <span className="block text-[clamp(1.5rem,4vw,3rem)] text-ember-400 mt-2 not-italic">
              {tagline}
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-bone-200/80 leading-relaxed animate-rise" style={{ animationDelay: '120ms' }}>
            Load the same film from your own drive. We never see it. We just keep
            everyone&rsquo;s playhead within a few hundred milliseconds of each
            other &mdash; a tiny conductor sitting between your browsers.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6 max-w-xl animate-rise" style={{ animationDelay: '240ms' }}>
            <Stat label="Rooms open" value={stats.rooms} />
            <Stat label="Seats filled" value={stats.users} />
            <Stat label="Server" value={connected ? 'ONLINE' : '— —'} mono />
          </div>

          <div className="mt-14 hairline w-full max-w-2xl" />
          <FilmStripFooter />
        </div>

        {/* Right: Entry panel */}
        <div className="lg:col-span-5 flex items-center">
          <div className="w-full animate-rise" style={{ animationDelay: '180ms' }}>
            <ModeToggle mode={mode} setMode={setMode} />
            <form onSubmit={submit} className="panel mt-4 px-6 py-7">
              <Field
                id="displayName"
                label="Your name"
                placeholder="e.g. Hitchcock"
                value={name}
                onChange={setName}
                maxLength={24}
              />
              <Field
                id="roomName"
                label={mode === 'create' ? 'New room title' : 'Existing room title'}
                placeholder="e.g. Tuesday Night Vertigo"
                value={roomName}
                onChange={setRoomName}
                maxLength={48}
              />
              <Field
                id="password"
                label="Room password"
                placeholder="Shared with your viewers"
                value={password}
                onChange={setPassword}
                type="password"
                maxLength={128}
              />

              <div className="flex items-center justify-between mt-8">
                <div className="font-mono text-[10px] text-bone-300/70 tracking-cinema uppercase">
                  {connected ? 'READY · ENCRYPTED HANDSHAKE' : 'WAITING FOR SERVER…'}
                </div>
                <button
                  type="submit"
                  disabled={!connected || submitting}
                  className="btn-primary"
                >
                  {submitting ? 'Opening…' : mode === 'create' ? 'Open the room' : 'Take a seat'}
                  <span aria-hidden>→</span>
                </button>
              </div>
            </form>
            <p className="mt-4 font-mono text-[10px] tracking-cinema uppercase text-bone-300/60">
              {mode === 'create'
                ? '↳ You become the host. Only you can play, pause, or seek.'
                : '↳ You will load your own copy of the film. Hashes are compared.'}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Header({ connected }) {
  return (
    <header className="px-6 lg:px-16 pt-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <ApertureMark />
        <span className="font-mono text-xs uppercase tracking-cinema text-bone-100">
          CoWatch <span className="text-bone-300/60">· sync-relay</span>
        </span>
      </div>
      <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-cinema">
        <span className={connected ? 'text-ember-400' : 'text-crimson-400'}>
          ● {connected ? 'SYNC LINK ESTABLISHED' : 'NO LINK'}
        </span>
        <span className="text-bone-300/60 hidden sm:inline">
          {new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date())}
        </span>
      </div>
    </header>
  );
}

function ApertureMark() {
  return (
    <span className="inline-block w-7 h-7 relative">
      <span className="absolute inset-0 rounded-full border border-ember-500 reel-spin" />
      <span className="absolute inset-[3px] rounded-full border border-bone-300/40" />
      <span className="absolute inset-[10px] rounded-full bg-ember-500" />
    </span>
  );
}

function Stat({ label, value, mono }) {
  return (
    <div>
      <div className={`text-bone-50 ${mono ? 'font-mono text-base' : 'font-display text-3xl'}`}>
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-cinema text-bone-300/70 mt-1">
        {label}
      </div>
    </div>
  );
}

function ModeToggle({ mode, setMode }) {
  const tab = (key, label) => (
    <button
      type="button"
      onClick={() => setMode(key)}
      className={`flex-1 font-mono text-[11px] uppercase tracking-cinema py-3 transition-colors ${
        mode === key
          ? 'text-ink-900 bg-bone-50'
          : 'text-bone-300 hover:text-bone-50 bg-transparent'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex border border-bone-300/20">
      {tab('create', 'Open a new room')}
      <div className="w-px bg-bone-300/20" />
      {tab('join', 'Join an existing room')}
    </div>
  );
}

function Field({ id, label, value, onChange, type = 'text', placeholder, maxLength }) {
  return (
    <div className="mt-6 first:mt-0">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete="off"
        spellCheck={false}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field"
      />
    </div>
  );
}

function FilmStripFooter() {
  return (
    <footer className="mt-10 flex items-center gap-4 font-mono text-[10px] tracking-cinema uppercase text-bone-300/50">
      <span className="tick">No video ever touches our server</span>
      <span className="text-bone-300/30">·</span>
      <span>SHA-256 verified locally</span>
      <span className="text-bone-300/30">·</span>
      <span>WebSocket relay only</span>
    </footer>
  );
}
