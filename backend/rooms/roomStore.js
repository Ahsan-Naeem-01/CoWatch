/**
 * In-memory room store. Implemented behind a small interface so it can be
 * swapped for a Redis-backed adapter later without touching call sites.
 *
 *   Room shape:
 *   {
 *     name, password, hostId, allowAllControl, createdAt,
 *     users: Map<socketId, { id, name, joinedAt }>,
 *     playback: { isPlaying, currentTime, playbackRate, updatedAt },
 *     activity: Array<{ at, kind, message }>
 *   }
 */

const rooms = new Map();
const emptyTimers = new Map(); // roomKey -> setTimeout handle
const EMPTY_ROOM_GRACE_MS = 60_000; // keep empty rooms around for 60s so reconnects can find them

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function cancelDestroy(roomKey) {
  const t = emptyTimers.get(roomKey);
  if (t) {
    clearTimeout(t);
    emptyTimers.delete(roomKey);
  }
}

function scheduleDestroy(roomKey) {
  cancelDestroy(roomKey);
  const t = setTimeout(() => {
    const room = rooms.get(roomKey);
    if (room && room.users.size === 0) rooms.delete(roomKey);
    emptyTimers.delete(roomKey);
  }, EMPTY_ROOM_GRACE_MS);
  emptyTimers.set(roomKey, t);
}

function pushActivity(room, kind, message) {
  room.activity.push({ at: Date.now(), kind, message });
  if (room.activity.length > 200) room.activity.shift();
}

export const roomStore = {
  size: () => rooms.size,

  userCount: () => {
    let total = 0;
    for (const r of rooms.values()) total += r.users.size;
    return total;
  },

  exists: (name) => rooms.has(normalizeName(name)),

  get: (name) => rooms.get(normalizeName(name)) || null,

  create: ({ name, password, hostId, hostName }) => {
    const key = normalizeName(name);
    if (rooms.has(key)) return { error: 'A room with that name already exists.' };

    const room = {
      name: String(name).trim(),
      key,
      password: String(password || ''),
      hostId,
      allowAllControl: false,
      createdAt: Date.now(),
      users: new Map(),
      playback: { isPlaying: false, currentTime: 0, playbackRate: 1, updatedAt: Date.now() },
      activity: [],
    };
    rooms.set(key, room);
    pushActivity(room, 'system', `${hostName} created the room.`);
    return { room };
  },

  /** Caller must verify the password before invoking. */
  addUser: (name, user) => {
    const room = rooms.get(normalizeName(name));
    if (!room) return null;
    cancelDestroy(room.key); // someone came back during the grace window
    room.users.set(user.id, user);
    pushActivity(room, 'join', `${user.name} joined.`);
    return room;
  },

  removeUser: (name, userId) => {
    const room = rooms.get(normalizeName(name));
    if (!room) return null;
    const user = room.users.get(userId);
    if (!user) return room;
    room.users.delete(userId);
    pushActivity(room, 'leave', `${user.name} left.`);

    // If the host left, promote the longest-tenured remaining user.
    if (room.hostId === userId && room.users.size > 0) {
      const next = [...room.users.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.hostId = next.id;
      pushActivity(room, 'system', `${next.name} is now the host.`);
    }

    if (room.users.size === 0) {
      // Don't destroy immediately — a transport blip (Cloudflare tunnel
      // reconnect, brief Wi-Fi drop) can disconnect every client at once.
      // Give them a window to rejoin before the room is gone for good.
      scheduleDestroy(room.key);
      return null;
    }
    return room;
  },

  updatePlayback: (name, patch) => {
    const room = rooms.get(normalizeName(name));
    if (!room) return null;
    room.playback = { ...room.playback, ...patch, updatedAt: Date.now() };
    return room;
  },

  setAllowAllControl: (name, value) => {
    const room = rooms.get(normalizeName(name));
    if (!room) return null;
    room.allowAllControl = Boolean(value);
    pushActivity(room, 'system', value ? 'Host opened controls to everyone.' : 'Host restricted controls.');
    return room;
  },

  pushActivity,
};
