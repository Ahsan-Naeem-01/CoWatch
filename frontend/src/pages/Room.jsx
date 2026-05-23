import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';
import { useApp } from '../context/AppContext.jsx';
import { useVideoSync } from '../hooks/useVideoSync.js';
import VideoPlayer from '../components/VideoPlayer.jsx';
import FileSelector from '../components/FileSelector.jsx';
import UsersList from '../components/UsersList.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import ActivityLog from '../components/ActivityLog.jsx';
import RoomHeader from '../components/RoomHeader.jsx';
import { makeReactionBurst } from '../components/EmojiReactions.jsx';

export default function Room() {
  const { name: encodedName } = useParams();
  const roomNameParam = decodeURIComponent(encodedName);
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { pushToast, userName, setUserName } = useApp();

  const [room, setRoom] = useState(location.state?.initialRoom || null);
  const [selfId, setSelfId] = useState(location.state?.selfId || null);
  const [chatMessages, setChatMessages] = useState([]);
  // Mobile-only side-panel selector. Desktop shows all three at once.
  const [activeTab, setActiveTab] = useState('chat');
  const [file, setFile] = useState(null);
  const [fileObjectUrl, setFileObjectUrl] = useState(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [reactions, setReactions] = useState([]);

  const videoRef = useRef(null);
  const passwordRef = useRef(location.state?.password || '');

  const isHost = !!(room && selfId && room.hostId === selfId);
  const canControl = !!(room && (isHost || room.allowAllControl));

  // ---------- Initial entry guard / reconnect recovery ----------
  useEffect(() => {
    if (room) return;
    pushToast({
      kind: 'info',
      title: 'Re-enter required',
      body: 'Please rejoin with the room password.',
    });
    navigate('/', { replace: true });
  }, [room, pushToast, navigate]);

  // ---------- Re-join on reconnect ----------
  useEffect(() => {
    if (!connected) return;
    if (socket.id === selfId) return;
    if (!passwordRef.current) return;
    socket.emit(
      'join-room',
      {
        name: roomNameParam,
        password: passwordRef.current,
        userName: userName || 'Anonymous',
      },
      (resp) => {
        if (resp?.error) {
          pushToast({
            kind: 'error',
            title: 'Reconnect failed',
            body: resp.error,
          });
          navigate('/', { replace: true });
          return;
        }
        setRoom(resp.room);
        setSelfId(resp.selfId);
      }
    );
  }, [connected, socket, selfId, roomNameParam, userName, pushToast, navigate]);

  // ---------- Socket subscriptions ----------
  useEffect(() => {
    const onRoomState = (next) => setRoom(next);
    const onChat = (msg) =>
      setChatMessages((prev) =>
        prev.length >= 200 ? [...prev.slice(-199), msg] : [...prev, msg]
      );
    const onConnected = ({ user }) =>
      pushToast({
        kind: 'info',
        title: 'New viewer',
        body: `${user.name} took a seat.`,
      });
    const onDisconnected = () => {};
    const onHostChange = ({ hostId }) => {
      pushToast({
        kind: 'info',
        title: 'Host changed',
        body:
          hostId === socket.id
            ? 'You are now the host.'
            : 'A new host has been promoted.',
      });
    };
    const onControlToggled = ({ allowAllControl }) => {
      setRoom((r) => (r ? { ...r, allowAllControl } : r));
      pushToast({
        kind: 'info',
        title: allowAllControl ? 'Open seating' : 'Host-only controls',
        body: allowAllControl
          ? 'Anyone can now play, pause, or seek.'
          : 'Only the host can control playback.',
      });
    };
    const onActivity = (activity) =>
      setRoom((r) => (r ? { ...r, activity } : r));
    const onError = (msg) =>
      pushToast({
        kind: 'error',
        title: 'Sync error',
        body: String(msg || 'Unknown error'),
      });

    const patchPlayback = (patch) =>
      setRoom((r) =>
        r ? { ...r, playback: { ...r.playback, ...patch } } : r
      );
    const onRemotePlayState = ({ currentTime }) =>
      patchPlayback({ isPlaying: true, currentTime });
    const onRemotePauseState = ({ currentTime }) =>
      patchPlayback({ isPlaying: false, currentTime });
    const onRemoteSeekState = ({ currentTime }) =>
      patchPlayback({ currentTime });
    const onRemoteRateState = ({ playbackRate }) =>
      patchPlayback({ playbackRate });
    const onReaction = ({ emoji }) => {
      if (!emoji) return;
      // Each tap spawns a burst; cap concurrent floats so a flood (or many
      // simultaneous senders) can't pile hundreds of emojis on the overlay.
      setReactions((prev) => {
        const burst = makeReactionBurst(emoji);
        const combined = [...prev, ...burst];
        return combined.length > 120 ? combined.slice(-120) : combined;
      });
    };

    socket.on('room-state', onRoomState);
    socket.on('chat-message', onChat);
    socket.on('user-connected', onConnected);
    socket.on('user-disconnected', onDisconnected);
    socket.on('host-change', onHostChange);
    socket.on('control-toggled', onControlToggled);
    socket.on('activity', onActivity);
    socket.on('error-message', onError);
    socket.on('remote-play', onRemotePlayState);
    socket.on('remote-pause', onRemotePauseState);
    socket.on('remote-seek', onRemoteSeekState);
    socket.on('remote-rate', onRemoteRateState);
    socket.on('reaction', onReaction);

    return () => {
      socket.off('room-state', onRoomState);
      socket.off('chat-message', onChat);
      socket.off('user-connected', onConnected);
      socket.off('user-disconnected', onDisconnected);
      socket.off('host-change', onHostChange);
      socket.off('control-toggled', onControlToggled);
      socket.off('activity', onActivity);
      socket.off('error-message', onError);
      socket.off('remote-play', onRemotePlayState);
      socket.off('remote-pause', onRemotePauseState);
      socket.off('remote-seek', onRemoteSeekState);
      socket.off('remote-rate', onRemoteRateState);
      socket.off('reaction', onReaction);
    };
  }, [socket, pushToast]);

  // ---------- File handling ----------
  const handleFileChosen = useCallback(
    (chosen) => {
      if (!chosen) return;
      if (fileObjectUrl) URL.revokeObjectURL(fileObjectUrl);
      const url = URL.createObjectURL(chosen);
      setFile(chosen);
      setFileObjectUrl(url);
    },
    [fileObjectUrl]
  );

  const handleAutoplayBlocked = useCallback(
    () => setAutoplayBlocked(true),
    []
  );
  const videoSync = useVideoSync({
    socket,
    videoRef,
    canControl,
    fileReady: !!fileObjectUrl,
    isHost,
    onAutoplayBlocked: handleAutoplayBlocked,
  });

  const { applySnapshot } = videoSync;
  const metadataReadyRef = useRef(false);
  const onMetadataLoaded = useCallback(() => {
    metadataReadyRef.current = true;
    socket.emit('sync-state', {}, (resp) => {
      if (resp?.ok && resp.room?.playback) {
        applySnapshot(resp.room.playback);
        setRoom((r) =>
          r ? { ...r, playback: resp.room.playback } : r
        );
      } else if (room?.playback) {
        applySnapshot(room.playback);
      }
    });
  }, [socket, room, applySnapshot]);

  useEffect(() => {
    if (!metadataReadyRef.current) return;
    if (!room?.playback) return;
    applySnapshot(room.playback);
  }, [
    room?.playback?.isPlaying,
    room?.playback?.playbackRate,
    applySnapshot,
  ]);

  const sendChat = useCallback(
    (text) => {
      if (!text.trim()) return;
      socket.emit('chat-message', { text });
    },
    [socket]
  );

  // Spawn the burst locally first so the sender sees instant feedback even
  // if the network round-trip is slow; the server intentionally doesn't echo
  // back to the sender (see backend/socket/socketHandler.js).
  const sendReaction = useCallback(
    (emoji) => {
      setReactions((prev) => {
        const burst = makeReactionBurst(emoji);
        const combined = [...prev, ...burst];
        return combined.length > 120 ? combined.slice(-120) : combined;
      });
      socket.emit('reaction', { emoji });
    },
    [socket]
  );

  const expireReaction = useCallback((id) => {
    setReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleAllowAll = useCallback(() => {
    if (!isHost || !room) return;
    socket.emit('toggle-control', { allowAll: !room.allowAllControl });
  }, [isHost, room, socket]);

  const copyInvite = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      pushToast({
        kind: 'success',
        title: 'Link copied',
        body: 'Share the password separately.',
      });
    } catch {
      pushToast({ kind: 'warn', title: 'Copy failed', body: url });
    }
  }, [pushToast]);

  const leave = useCallback(() => {
    socket.emit('leave-room');
    if (fileObjectUrl) URL.revokeObjectURL(fileObjectUrl);
    navigate('/');
  }, [socket, navigate, fileObjectUrl]);

  const renameSelf = useCallback(
    (next) => {
      const trimmed = next.trim().slice(0, 24);
      if (!trimmed) return;
      setUserName(trimmed);
      socket.emit('rename', { userName: trimmed });
    },
    [socket, setUserName]
  );

  if (!room) return null;

  const tabs = [
    { key: 'chat', label: 'Chat', count: chatMessages.length },
    { key: 'viewers', label: 'Viewers', count: room.users.length },
    { key: 'activity', label: 'Activity', count: (room.activity || []).length },
  ];

  return (
    <div className="min-h-screen lg:h-screen flex flex-col fade-in lg:min-h-0 lg:overflow-hidden">
      <RoomHeader
        room={room}
        isHost={isHost}
        connected={connected}
        onCopy={copyInvite}
        onLeave={leave}
        onToggleAllowAll={toggleAllowAll}
      />

      {/* Unified layout — stacks on mobile, becomes 3-column theater on lg+.
          Rendering a single VideoPlayer (not duplicated per breakpoint) keeps
          the same <video> element and ref alive across resizes, so playback
          state is preserved and only one ref claim happens. */}
      <section className="px-4 lg:px-5 pb-5 pt-4 flex flex-col gap-4 lg:flex-1 lg:min-h-0 lg:grid lg:grid-cols-[280px_1fr_360px] lg:grid-rows-1">
        {/* Activity rail — desktop sidebar only */}
        <div className="hidden lg:block min-h-0">
          <ActivityLog room={room} />
        </div>

        {/* Center column: video stage + (desktop footer | mobile tabs) */}
        <div className="flex flex-col min-h-0 gap-3">
          <div className="rounded-[14px] overflow-hidden border border-line bg-black relative aspect-video flex-shrink-0 lg:aspect-auto lg:flex-1 lg:flex-shrink lg:min-h-0">
            {!fileObjectUrl ? (
              <FileSelector onPick={handleFileChosen} />
            ) : (
              <VideoPlayer
                videoRef={videoRef}
                src={fileObjectUrl}
                file={file}
                canControl={canControl}
                isHost={isHost}
                roomPlayback={room.playback}
                onMetadataLoaded={onMetadataLoaded}
                onAutoplayBlocked={() => setAutoplayBlocked(true)}
                autoplayBlocked={autoplayBlocked}
                onResolveAutoplay={() => setAutoplayBlocked(false)}
                reactions={reactions}
                onSendReaction={sendReaction}
                onExpireReaction={expireReaction}
              />
            )}
          </div>

          {/* Desktop foot bar */}
          <div className="hidden lg:block">
            <RoomFootBar
              file={file}
              onClearFile={() => {
                if (fileObjectUrl) URL.revokeObjectURL(fileObjectUrl);
                setFile(null);
                setFileObjectUrl(null);
              }}
              users={room.users}
            />
          </div>

          {/* Mobile tab switcher */}
          <div className="lg:hidden flex border border-line rounded-full bg-surface p-1 self-start">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-full mono text-[11px] tracking-cinema uppercase transition-colors ${
                  activeTab === t.key
                    ? 'bg-accent text-white'
                    : 'text-fg-2 hover:text-fg'
                }`}
              >
                {t.label}
                <span className="ml-1.5 opacity-70">{t.count}</span>
              </button>
            ))}
          </div>

          {/* Mobile tab content */}
          <div className="lg:hidden card min-h-[480px] flex flex-col overflow-hidden">
            {activeTab === 'chat' && (
              <ChatPanel
                messages={chatMessages}
                onSend={sendChat}
                selfId={selfId}
                users={room.users}
                embed
              />
            )}
            {activeTab === 'viewers' && (
              <UsersList room={room} selfId={selfId} onRename={renameSelf} />
            )}
            {activeTab === 'activity' && <ActivityLog room={room} embed />}
          </div>
        </div>

        {/* Chat — desktop sidebar only */}
        <div className="hidden lg:block min-h-0">
          <ChatPanel
            messages={chatMessages}
            onSend={sendChat}
            selfId={selfId}
            users={room.users}
          />
        </div>
      </section>
    </div>
  );
}

/* ── Tiny strip beneath the video on desktop showing viewers ── */
function RoomFootBar({ file, onClearFile, users }) {
  return (
    <div className="card flex items-center gap-4 px-4 py-3 flex-wrap">
      <div className="mono text-[11px] uppercase tracking-cinema text-fg-3 flex-shrink-0">
        In the room
      </div>
      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
        {users.slice(0, 6).map((u, i) => (
          <div
            key={u.id}
            className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-line bg-bg-2"
            title={u.name}
          >
            <span
              className={`av av-${i % 6}`}
              style={{ width: 22, height: 22, fontSize: 10 }}
            >
              {(u.name || '?').slice(0, 1).toUpperCase()}
            </span>
            <span className="text-[12px] text-fg truncate max-w-[120px]">
              {u.name}
            </span>
          </div>
        ))}
        {users.length > 6 && (
          <span className="mono text-[12px] text-fg-3">
            + {users.length - 6} more
          </span>
        )}
      </div>
      {file && (
        <button onClick={onClearFile} className="btn btn-ghost text-[13px]">
          Change reel
        </button>
      )}
    </div>
  );
}
