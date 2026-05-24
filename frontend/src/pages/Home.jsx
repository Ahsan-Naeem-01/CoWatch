import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';
import { useApp } from '../context/AppContext.jsx';
import Brand from '../components/Brand.jsx';
import { Icon } from '../components/Icon.jsx';

const HERO_TAGLINES = [
  'frame by frame.',
  'in lockstep.',
  'on every screen.',
];

export default function Home() {
  const { socket, connected } = useSocket();
  const { userName, setUserName, pushToast } = useApp();
  const navigate = useNavigate();

  // 'landing' shows the hero. 'create' / 'join' swap to the auth form.
  const [view, setView] = useState('landing');
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(userName || '');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ rooms: 0, users: 0 });
  const [taglineIdx, setTaglineIdx] = useState(0);

  useEffect(() => {
    const i = setInterval(
      () => setTaglineIdx((n) => (n + 1) % HERO_TAGLINES.length),
      4200
    );
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const url =
      (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000') +
      '/api/rooms/count';
    let stopped = false;
    const refresh = async () => {
      try {
        // ngrok-skip-browser-warning bypasses the *.ngrok-free.app interstitial
        // page so the fetch gets real JSON instead of the warning HTML. Safe
        // to send to non-ngrok backends — they just ignore the unknown header.
        const res = await fetch(url, {
          headers: { 'ngrok-skip-browser-warning': 'true' },
        });
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
    e?.preventDefault();
    const safeName = name.trim() || 'Anonymous';
    setUserName(safeName);
    if (!roomName.trim() || !password) {
      pushToast({
        kind: 'warn',
        title: 'Missing fields',
        body: 'Room name and password are required.',
      });
      return;
    }
    setSubmitting(true);
    const event = view === 'create' ? 'create-room' : 'join-room';
    socket.emit(
      event,
      { name: roomName.trim(), password, userName: safeName },
      (resp) => {
        setSubmitting(false);
        if (resp?.error) {
          pushToast({
            kind: 'error',
            title: 'Could not enter room',
            body: resp.error,
          });
          return;
        }
        navigate(`/room/${encodeURIComponent(roomName.trim())}`, {
          state: { initialRoom: resp.room, selfId: resp.selfId, password },
        });
      }
    );
  };

  return (
    <main className="flex-1 flex flex-col">
      {view === 'landing' ? (
        <Landing
          connected={connected}
          stats={stats}
          onCreate={() => setView('create')}
          onJoin={() => setView('join')}
          taglineIdx={taglineIdx}
        />
      ) : (
        <AuthScreen
          kind={view}
          name={name}
          setName={setName}
          roomName={roomName}
          setRoomName={setRoomName}
          password={password}
          setPassword={setPassword}
          connected={connected}
          submitting={submitting}
          onSubmit={submit}
          onSwap={() => setView(view === 'create' ? 'join' : 'create')}
          onBack={() => setView('landing')}
        />
      )}
    </main>
  );
}

/* ─────────────────────────────── Landing ─────────────────────────────── */
function Landing({ connected, stats, onCreate, onJoin, taglineIdx }) {
  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] fade-in min-h-0">
      {/* Left — hero */}
      <div className="px-8 lg:px-16 py-12 lg:py-16 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between">
          <Brand />
          <span className="eyebrow flex items-center gap-2">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                connected ? 'bg-accent' : 'bg-danger'
              }`}
            />
            <span>
              {connected ? 'Sync relay · online' : 'Offline · reconnecting…'}
            </span>
          </span>
        </div>

        <div className="max-w-[600px] flex flex-col gap-6 mt-12 lg:mt-0">
          <span className="eyebrow">Synchronized cinema for two or more</span>
          <h1
            className="display"
            style={{
              fontSize: 'clamp(48px, 7vw, 88px)',
              lineHeight: 0.95,
              letterSpacing: '-0.025em',
            }}
          >
            Watch <em className="text-accent italic">together</em>,
            <br />
            <span className="block transition-opacity">
              {HERO_TAGLINES[taglineIdx]}
            </span>
          </h1>
          <p className="text-fg-2 text-[17px] leading-relaxed max-w-[480px]">
            Drop a file in, share a room code, and press play in lockstep.
            CoWatch keeps every screen on the same frame — no buffering
            tug-of-war, no “did you pause?”
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <button className="btn btn-primary" onClick={onCreate}>
              <Icon name="plus" size={16} />
              Create a room
            </button>
            <button className="btn btn-ghost" onClick={onJoin}>
              <Icon name="arrow_join" size={16} />
              Join a room
            </button>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6">
          <div className="hairline" />
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap gap-10">
              <Stat label="Rooms open" value={stats.rooms} />
              <Stat label="Seats filled" value={stats.users} />
              <Stat
                label="Latency"
                value={connected ? '< 250ms' : '— —'}
                mono
              />
            </div>
            <span className="eyebrow">© 2026 CoWatch</span>
          </div>
        </div>
      </div>

      {/* Right — preview + feature list */}
      <div className="bg-bg-2 border-l border-line px-8 lg:px-16 py-12 lg:py-16 flex flex-col justify-center gap-10 relative">
        <span className="eyebrow">Three rooms, one frame</span>

        <div className="preview-stack" aria-hidden="true">
          <div className="preview-card p1">
            <div className="preview-thumb">
              <svg viewBox="0 0 24 24">
                <path d="M6 4l14 8-14 8V4z" fill="currentColor" />
              </svg>
            </div>
          </div>
          <div className="preview-card p2">
            <div className="preview-thumb">
              <svg viewBox="0 0 24 24">
                <path d="M6 4l14 8-14 8V4z" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>

        <ul className="list-none m-0 p-0 flex flex-col gap-0 max-w-[420px]">
          <Feature
            n="01"
            title="Frame-perfect sync"
            text="If one pauses, all pause. If one seeks, all seek."
          />
          <Feature
            n="02"
            title="Bring your own file"
            text="Everyone loads the same source locally — nothing leaves your machine."
          />
          <Feature
            n="03"
            title="Chat & activity"
            text="Live messaging beside the screen and a log so nothing slips by."
          />
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, mono }) {
  return (
    <div>
      <div
        className={`text-fg ${mono ? 'mono text-base' : 'display text-3xl'}`}
      >
        {value}
      </div>
      <div className="mono text-[10px] uppercase tracking-cinema text-fg-3 mt-1">
        {label}
      </div>
    </div>
  );
}

function Feature({ n, title, text }) {
  return (
    <li className="grid grid-cols-[28px_1fr] gap-3 py-4 border-t border-line last:border-b last:border-line">
      <span className="mono text-[11px] text-accent tracking-cinema">{n}</span>
      <span>
        <b className="block text-fg font-medium text-[14px] mb-1">{title}</b>
        <span className="text-fg-2 text-[14px] leading-snug">{text}</span>
      </span>
    </li>
  );
}

/* ─────────────────────────────── Auth ─────────────────────────────── */
function AuthScreen({
  kind,
  name,
  setName,
  roomName,
  setRoomName,
  password,
  setPassword,
  connected,
  submitting,
  onSubmit,
  onSwap,
  onBack,
}) {
  const isCreate = kind === 'create';
  return (
    <div className="flex-1 flex flex-col fade-in">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 lg:px-10 py-5 border-b border-line">
        <Brand />
        <div className="flex items-center gap-3">
          <span className="eyebrow hidden sm:inline">
            {connected ? '● link stable' : '● waiting for relay'}
          </span>
          <button className="btn btn-ghost" onClick={onBack}>
            <Icon name="arrow_left" size={14} />
            Back
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
        {/* Side art */}
        <div className="bg-bg-2 border-r border-line px-10 py-12 lg:py-16 flex flex-col justify-between overflow-hidden relative">
          <span className="eyebrow">
            {isCreate ? 'Step 01 · Create' : 'Step 01 · Join'}
          </span>
          <div className="flex-1 flex items-center justify-center">
            <div className="orb" />
          </div>
          <div
            className="display max-w-[420px] text-fg-2 italic"
            style={{ fontSize: 22, lineHeight: 1.3 }}
          >
            {isCreate ? (
              <>
                “A room is a private living-room.{' '}
                <em className="not-italic text-accent">
                  Pick a name your people will remember.
                </em>
                ”
              </>
            ) : (
              <>
                “Use the room name your friend sent you and the password they
                set.{' '}
                <em className="not-italic text-accent">That's it.</em>
                ”
              </>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="px-8 lg:px-12 py-12 lg:py-16 flex items-center justify-center">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-[440px] flex flex-col gap-6"
          >
            <span className="eyebrow">
              {isCreate ? 'A new room' : 'Existing room'}
            </span>
            <h2 className="display text-[44px] m-0">
              {isCreate ? 'Set up your room.' : 'Step into the room.'}
            </h2>
            <p className="text-fg-2 text-[15px] leading-relaxed -mt-2">
              {isCreate
                ? 'Pick a room name and password. Anyone with both can join.'
                : 'Enter the name and password your host shared with you.'}
            </p>

            <div className="flex flex-col gap-4 mt-2">
              <Field
                id="displayName"
                label="Your display name"
                placeholder="What should people call you?"
                value={name}
                onChange={setName}
                maxLength={24}
              />
              <Field
                id="roomName"
                label="Room name"
                placeholder={
                  isCreate ? 'e.g. tuesday-rewatch' : 'e.g. midnight-cinema'
                }
                value={roomName}
                onChange={setRoomName}
                maxLength={48}
              />
              <Field
                id="password"
                label={isCreate ? 'Set a password' : 'Password'}
                placeholder="••••••••"
                value={password}
                onChange={setPassword}
                type="password"
                maxLength={128}
              />
            </div>

            <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
              <div className="text-fg-3 text-[13px]">
                {isCreate ? (
                  <>
                    Already have a room?{' '}
                    <a
                      onClick={onSwap}
                      className="text-accent hover:underline cursor-pointer"
                    >
                      Join one instead
                    </a>
                    .
                  </>
                ) : (
                  <>
                    No room yet?{' '}
                    <a
                      onClick={onSwap}
                      className="text-accent hover:underline cursor-pointer"
                    >
                      Create your own
                    </a>
                    .
                  </>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!connected || submitting}
              >
                {submitting
                  ? 'Opening…'
                  : isCreate
                  ? 'Create room'
                  : 'Enter room'}
                <Icon name="arrow_right" size={14} />
              </button>
            </div>

            <div className="mt-2 eyebrow flex items-center gap-2">
              <Icon name="lock" size={12} />
              <span>
                {isCreate
                  ? 'You become the host. Only you can play, pause, or seek.'
                  : 'Files compared by hash — bring the same copy.'}
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, type = 'text', placeholder, maxLength }) {
  return (
    <div className="field-wrap">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        autoComplete="off"
        spellCheck={false}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </div>
  );
}
