/**
 * Room controller — orchestrates room create/join/leave on top of the room
 * store. Keeps the socket layer focused on event plumbing while business
 * rules (password check, host promotion, broadcast shape) live here.
 */

import { roomStore } from '../rooms/roomStore.js';
import { sanitizeRoomName, sanitizeUserName, sanitizePassword } from '../utils/sanitize.js';

export const RoomController = {
  createRoom({ name, password, userId, userName }) {
    const cleanName = sanitizeRoomName(name);
    const cleanUser = sanitizeUserName(userName);
    const cleanPass = sanitizePassword(password);

    if (cleanName.length < 2) return { error: 'Room name must be at least 2 characters.' };
    if (cleanPass.length < 1) return { error: 'Password is required.' };
    if (roomStore.exists(cleanName)) return { error: 'A room with that name already exists.' };

    const { room, error } = roomStore.create({
      name: cleanName,
      password: cleanPass,
      hostId: userId,
      hostName: cleanUser,
    });
    if (error) return { error };

    const user = {
      id: userId,
      name: cleanUser,
      joinedAt: Date.now(),
      lastHeartbeat: Date.now(),
      currentTime: 0,
    };
    roomStore.addUser(cleanName, user);
    return { room, user };
  },

  joinRoom({ name, password, userId, userName }) {
    const cleanName = sanitizeRoomName(name);
    const cleanUser = sanitizeUserName(userName);
    const cleanPass = sanitizePassword(password);

    const room = roomStore.get(cleanName);
    if (!room) return { error: 'Room not found.' };
    if (room.password !== cleanPass) return { error: 'Incorrect password.' };

    const user = {
      id: userId,
      name: cleanUser,
      joinedAt: Date.now(),
      lastHeartbeat: Date.now(),
      currentTime: 0,
    };
    roomStore.addUser(cleanName, user);
    return { room, user };
  },

  leaveRoom({ name, userId }) {
    const room = roomStore.removeUser(name, userId);
    return { room };
  },
};

/** Public, password-stripped projection of a room — safe to send to clients. */
export function projectRoom(room) {
  if (!room) return null;
  return {
    name: room.name,
    hostId: room.hostId,
    allowAllControl: room.allowAllControl,
    createdAt: room.createdAt,
    users: [...room.users.values()].map((u) => ({
      id: u.id,
      name: u.name,
      joinedAt: u.joinedAt,
      currentTime: u.currentTime,
    })),
    fileSignature: room.fileSignature,
    playback: room.playback,
    activity: room.activity.slice(-50),
  };
}
