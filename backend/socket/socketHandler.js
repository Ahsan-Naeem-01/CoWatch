/**
 * Socket.IO event wiring.
 *
 *   Inbound (client -> server):
 *     create-room, join-room, leave-room
 *     play, pause, seek, playback-rate, sync-state
 *     file-hash, chat-message, toggle-control, rename
 *
 *   Outbound (server -> client / room):
 *     room-state
 *     remote-play, remote-pause, remote-seek, remote-rate
 *     user-connected, user-disconnected, host-change, control-toggled
 *     file-hash-update, file-hash-mismatch
 *     chat-message, activity, error-message
 *
 * Sync model: event-driven. Peers stay aligned via play/pause/seek/rate
 * broadcasts. There is no periodic heartbeat or drift correction — late
 * joiners get the right position because `projectRoom` projects the playhead
 * forward in time at read time (see controllers/roomController.js).
 */

import { RoomController, projectRoom } from '../controllers/roomController.js';
import { roomStore } from '../rooms/roomStore.js';
import { attachRateLimiter } from '../middleware/rateLimit.js';
import { sanitizeChatMessage, sanitizeUserName } from '../utils/sanitize.js';
import {
  validTimestamp,
  validPlaybackRate,
  validBoolean,
  validFileSignature,
} from '../utils/validators.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    attachRateLimiter(socket);

    // Per-socket session state.
    socket.data.roomName = null;
    socket.data.userName = null;

    const isHost = () => {
      const room = roomStore.get(socket.data.roomName);
      return room && room.hostId === socket.id;
    };

    const canControl = () => {
      const room = roomStore.get(socket.data.roomName);
      if (!room) return false;
      return room.allowAllControl || room.hostId === socket.id;
    };

    const guard = (fn) => (payload, ack) => {
      if (!socket.allowEvent()) {
        if (typeof ack === 'function') ack({ error: 'rate-limited' });
        return;
      }
      try {
        fn(payload, ack);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('socket handler error', err);
        if (typeof ack === 'function') ack({ error: 'internal-error' });
      }
    };

    // ---------- Room lifecycle ----------

    socket.on(
      'create-room',
      guard(({ name, password, userName }, ack) => {
        const result = RoomController.createRoom({
          name,
          password,
          userName,
          userId: socket.id,
        });
        if (result.error) return ack?.({ error: result.error });

        socket.data.roomName = result.room.name;
        socket.data.userName = result.user.name;
        socket.join(result.room.key);

        ack?.({ ok: true, room: projectRoom(result.room), selfId: socket.id });
        socket.to(result.room.key).emit('user-connected', { user: result.user });
        io.to(result.room.key).emit('room-state', projectRoom(result.room));
      })
    );

    socket.on(
      'join-room',
      guard(({ name, password, userName }, ack) => {
        const result = RoomController.joinRoom({
          name,
          password,
          userName,
          userId: socket.id,
        });
        if (result.error) return ack?.({ error: result.error });

        socket.data.roomName = result.room.name;
        socket.data.userName = result.user.name;
        socket.join(result.room.key);

        ack?.({ ok: true, room: projectRoom(result.room), selfId: socket.id });
        socket.to(result.room.key).emit('user-connected', { user: result.user });
        io.to(result.room.key).emit('room-state', projectRoom(result.room));
      })
    );

    socket.on(
      'leave-room',
      guard((_payload, ack) => {
        leaveCurrent();
        ack?.({ ok: true });
      })
    );

    // ---------- Playback control ----------

    socket.on(
      'play',
      guard(({ currentTime } = {}) => {
        if (!canControl()) return;
        const t = validTimestamp(currentTime) ?? 0;
        const room = roomStore.updatePlayback(socket.data.roomName, {
          isPlaying: true,
          currentTime: t,
        });
        if (!room) return;
        roomStore.pushActivity(room, 'play', `${socket.data.userName} pressed play.`);
        socket.to(room.key).emit('remote-play', { currentTime: t, sourceId: socket.id });
        io.to(room.key).emit('activity', tailActivity(room));
      })
    );

    socket.on(
      'pause',
      guard(({ currentTime } = {}) => {
        if (!canControl()) return;
        const t = validTimestamp(currentTime) ?? 0;
        const room = roomStore.updatePlayback(socket.data.roomName, {
          isPlaying: false,
          currentTime: t,
        });
        if (!room) return;
        roomStore.pushActivity(room, 'pause', `${socket.data.userName} paused.`);
        socket.to(room.key).emit('remote-pause', { currentTime: t, sourceId: socket.id });
        io.to(room.key).emit('activity', tailActivity(room));
      })
    );

    socket.on(
      'seek',
      guard(({ currentTime } = {}) => {
        if (!canControl()) return;
        const t = validTimestamp(currentTime);
        if (t === null) return;
        const room = roomStore.updatePlayback(socket.data.roomName, { currentTime: t });
        if (!room) return;
        roomStore.pushActivity(room, 'seek', `${socket.data.userName} seeked to ${t.toFixed(1)}s.`);
        socket.to(room.key).emit('remote-seek', { currentTime: t, sourceId: socket.id });
        io.to(room.key).emit('activity', tailActivity(room));
      })
    );

    socket.on(
      'playback-rate',
      guard(({ playbackRate } = {}) => {
        if (!canControl()) return;
        const r = validPlaybackRate(playbackRate);
        if (r === null) return;
        const room = roomStore.updatePlayback(socket.data.roomName, { playbackRate: r });
        if (!room) return;
        roomStore.pushActivity(room, 'rate', `${socket.data.userName} set speed ${r}x.`);
        socket.to(room.key).emit('remote-rate', { playbackRate: r, sourceId: socket.id });
        io.to(room.key).emit('activity', tailActivity(room));
      })
    );

    // Authoritative state requested by a reconnecting / late-joining client.
    socket.on(
      'sync-state',
      guard((_payload, ack) => {
        const room = roomStore.get(socket.data.roomName);
        if (!room) return ack?.({ error: 'not-in-room' });
        ack?.({ ok: true, room: projectRoom(room) });
      })
    );

    // ---------- File hash verification ----------

    socket.on(
      'file-hash',
      guard(({ signature } = {}) => {
        const sig = validFileSignature(signature);
        if (!sig) return;
        const room = roomStore.get(socket.data.roomName);
        if (!room) return;

        const user = room.users.get(socket.id);
        if (user) user.fileSignature = sig;

        // Lock the room's signature to whatever the host first reports.
        if (room.hostId === socket.id || !room.fileSignature) {
          roomStore.setFileSignature(room.name, sig);
        }

        const matches = room.fileSignature && room.fileSignature.hash === sig.hash;
        if (!matches && room.fileSignature) {
          socket.emit('file-hash-mismatch', {
            expected: room.fileSignature,
            actual: sig,
          });
        }
        io.to(room.key).emit('file-hash-update', {
          roomSignature: room.fileSignature,
          userId: socket.id,
          userSignature: sig,
          match: !!matches,
        });
      })
    );

    // ---------- Host controls ----------

    socket.on(
      'toggle-control',
      guard(({ allowAll } = {}) => {
        if (!isHost()) return;
        const v = validBoolean(allowAll);
        if (v === null) return;
        const room = roomStore.setAllowAllControl(socket.data.roomName, v);
        if (!room) return;
        io.to(room.key).emit('control-toggled', { allowAllControl: room.allowAllControl });
        io.to(room.key).emit('activity', tailActivity(room));
      })
    );

    // ---------- Chat ----------

    socket.on(
      'chat-message',
      guard(({ text } = {}) => {
        const clean = sanitizeChatMessage(text);
        if (!clean) return;
        const room = roomStore.get(socket.data.roomName);
        if (!room) return;
        const message = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          userId: socket.id,
          userName: socket.data.userName,
          text: clean,
          at: Date.now(),
        };
        io.to(room.key).emit('chat-message', message);
      })
    );

    // ---------- Rename (optional) ----------

    socket.on(
      'rename',
      guard(({ userName } = {}) => {
        const clean = sanitizeUserName(userName);
        const room = roomStore.get(socket.data.roomName);
        if (!room) return;
        const user = room.users.get(socket.id);
        if (!user) return;
        const old = user.name;
        user.name = clean;
        socket.data.userName = clean;
        roomStore.pushActivity(room, 'system', `${old} is now ${clean}.`);
        io.to(room.key).emit('room-state', projectRoom(room));
      })
    );

    // ---------- Disconnect ----------

    socket.on('disconnect', () => leaveCurrent());

    function leaveCurrent() {
      const roomName = socket.data.roomName;
      if (!roomName) return;
      const room = roomStore.get(roomName);
      const roomKey = room?.key;
      const updated = RoomController.leaveRoom({ name: roomName, userId: socket.id }).room;
      socket.data.roomName = null;
      if (roomKey) {
        socket.leave(roomKey);
        if (updated) {
          io.to(roomKey).emit('user-disconnected', { userId: socket.id });
          io.to(roomKey).emit('room-state', projectRoom(updated));
          if (updated.hostId && updated.hostId !== socket.id) {
            io.to(roomKey).emit('host-change', { hostId: updated.hostId });
          }
        }
      }
    }
  });
}

function tailActivity(room) {
  return room.activity.slice(-50);
}
