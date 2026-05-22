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
import SyncIndicator from '../components/SyncIndicator.jsx';
import RoomHeader from '../components/RoomHeader.jsx';

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
  const [activeTab, setActiveTab] = useState('viewers'); // 'viewers' | 'chat' | 'activity'
  const [file, setFile] = useState(null);
  const [fileObjectUrl, setFileObjectUrl] = useState(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const videoRef = useRef(null);
  const passwordRef = useRef(location.state?.password || '');

  const isHost = !!(room && selfId && room.hostId === selfId);
  const canControl = !!(room && (isHost || room.allowAllControl));

  // ---------- Initial entry guard / reconnect recovery ----------
  // If a user lands directly on /room/:name (e.g. via copied link or refresh),
  // we need a password to (re)join. Bounce them home with a hint.
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
    // If we have a selfId already, the connection is fresh enough.
    if (socket.id === selfId) return;
    // Otherwise: silently rejoin using the stored password.
    if (!passwordRef.current) return;
    socket.emit(
      'join-room',
      { name: roomNameParam, password: passwordRef.current, userName: userName || 'Anonymous' },
      (resp) => {
        if (resp?.error) {
          pushToast({ kind: 'error', title: 'Reconnect failed', body: resp.error });
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
      setChatMessages((prev) => (prev.length >= 200 ? [...prev.slice(-199), msg] : [...prev, msg]));
    const onConnected = ({ user }) =>
      pushToast({ kind: 'info', title: 'New viewer', body: `${user.name} took a seat.` });
    const onDisconnected = () => {
      // Light touch — room-state will reconcile names.
    };
    const onHostChange = ({ hostId }) => {
      pushToast({
        kind: 'info',
        title: 'Host changed',
        body: hostId === socket.id ? 'You are now the host.' : 'A new host has been promoted.',
      });
    };
    const onControlToggled = ({ allowAllControl }) => {
      // Propagate the new permission into local room state so every viewer's
      // `canControl` flips immediately — without it, peers stayed locked until
      // an unrelated room-state push (or a manual reload) arrived.
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
      pushToast({ kind: 'error', title: 'Sync error', body: String(msg || 'Unknown error') });

    // Mirror remote playback events into room.playback so the snapshot
    // re-applied on metadata-load / state-change effect sees fresh data.
    const patchPlayback = (patch) =>
      setRoom((r) => (r ? { ...r, playback: { ...r.playback, ...patch } } : r));
    const onRemotePlayState = ({ currentTime }) =>
      patchPlayback({ isPlaying: true, currentTime });
    const onRemotePauseState = ({ currentTime }) =>
      patchPlayback({ isPlaying: false, currentTime });
    const onRemoteSeekState = ({ currentTime }) => patchPlayback({ currentTime });
    const onRemoteRateState = ({ playbackRate }) => patchPlayback({ playbackRate });

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
    };
  }, [socket, pushToast]);

  // ---------- Leave-on-exit ----------
  // We intentionally do NOT call `socket.emit('leave-room')` from an effect
  // cleanup: React 18 StrictMode invokes effect cleanups synchronously after
  // the first mount in development, which would silently remove the host
  // from a freshly-created room and let the server garbage-collect it
  // before any peer could join. Cleanup is handled by:
  //   - The explicit `leave()` button below.
  //   - The server's `disconnect` handler (covers tab close / refresh).
  // The object-URL is released in `handleFileChosen` and `leave()`.

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

  // ---------- Late-join: apply playback snapshot after the video can play ----------
  // Stable callback so `applySnapshot` (and the inner socket handlers in
  // useVideoSync) don't get re-created on every render, which would otherwise
  // re-trigger the "snapshot follow-up" effect below in a loop.
  const handleAutoplayBlocked = useCallback(() => setAutoplayBlocked(true), []);
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
    // Ask the server for the freshest playback snapshot — it projects the
    // playhead forward based on how long ago play was pressed, so a peer who
    // just finished hashing their file still lands at the host's current
    // position rather than wherever play was originally pressed.
    socket.emit('sync-state', {}, (resp) => {
      if (resp?.ok && resp.room?.playback) {
        applySnapshot(resp.room.playback);
        setRoom((r) => (r ? { ...r, playback: resp.room.playback } : r));
      } else if (room?.playback) {
        applySnapshot(room.playback);
      }
    });
  }, [socket, room, applySnapshot]);

  // If a remote play/pause arrived *before* the video element was ready, the
  // sync hook's handler short-circuited and the video stayed paused. Once
  // metadata has loaded and `room.playback.isPlaying` flips, re-apply the
  // snapshot so the video catches up. Keyed on the boolean state transition
  // (and on rate) so reconnects and host-driven changes both converge here.
  useEffect(() => {
    if (!metadataReadyRef.current) return;
    if (!room?.playback) return;
    applySnapshot(room.playback);
  }, [room?.playback?.isPlaying, room?.playback?.playbackRate, applySnapshot]);

  const sendChat = useCallback(
    (text) => {
      if (!text.trim()) return;
      socket.emit('chat-message', { text });
    },
    [socket]
  );

  const toggleAllowAll = useCallback(() => {
    if (!isHost || !room) return;
    socket.emit('toggle-control', { allowAll: !room.allowAllControl });
  }, [isHost, room, socket]);

  const copyInvite = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      pushToast({ kind: 'success', title: 'Link copied', body: 'Share the password separately.' });
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

  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      <RoomHeader
        room={room}
        isHost={isHost}
        connected={connected}
        onCopy={copyInvite}
        onLeave={leave}
        onToggleAllowAll={toggleAllowAll}
      />

      <section className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 px-6 lg:px-10 pb-10">
        {/* Theater */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
          <div className="relative panel overflow-hidden">
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
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SyncIndicator connected={connected} />
            {file && (
              <button
                onClick={() => {
                  if (fileObjectUrl) URL.revokeObjectURL(fileObjectUrl);
                  setFile(null);
                  setFileObjectUrl(null);
                }}
                className="btn-ghost"
              >
                Change reel
              </button>
            )}
          </div>
        </div>

        {/* Side panel */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col">
          <SidePanelTabs active={activeTab} onChange={setActiveTab} unreadCount={0} />
          <div className="panel flex-1 min-h-[500px] mt-0 -mt-px border-t-0 flex flex-col">
            {activeTab === 'viewers' && (
              <UsersList
                room={room}
                selfId={selfId}
                onRename={renameSelf}
              />
            )}
            {activeTab === 'chat' && (
              <ChatPanel messages={chatMessages} onSend={sendChat} selfId={selfId} />
            )}
            {activeTab === 'activity' && <ActivityLog room={room} />}
          </div>
        </aside>
      </section>
    </main>
  );
}

function SidePanelTabs({ active, onChange }) {
  const tab = (key, label) => (
    <button
      onClick={() => onChange(key)}
      className={`flex-1 font-mono text-[10px] uppercase tracking-cinema py-3 transition-colors border-b-2 ${
        active === key
          ? 'text-bone-50 border-ember-500'
          : 'text-bone-300/70 border-transparent hover:text-bone-50'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex border border-bone-300/10 bg-ink-800/70">
      {tab('viewers', 'Viewers')}
      {tab('chat', 'Chat')}
      {tab('activity', 'Activity')}
    </div>
  );
}
