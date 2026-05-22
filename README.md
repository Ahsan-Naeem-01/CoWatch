# CoWatch

> Watch the same local video file in sync with friends — the server never sees your file.

CoWatch is a full-stack synchronized local-video player. Each viewer loads
their own copy of a film from their own disk. The Node/Socket.IO backend only
acts as a sync relay for play / pause / seek / playbackRate events — nothing
about the file leaves your machine.

Sync model is **event-driven**: peers stay aligned because every play, pause,
seek, and rate-change is broadcast to the room. The server also projects the
playhead forward at read time, so a late-joining peer lands at the host's
current position rather than wherever the host originally pressed play.

---

## Tech stack

- **Frontend** — React 18 (Vite), TailwindCSS, Socket.IO client, React Router
- **Backend** — Node.js, Express, Socket.IO
- **Storage** — in-memory `roomStore` (swappable for Redis later)

---

## Quick start

Requires **Node 18+** and **npm 8+**.

```bash
# from the repo root
npm install --workspaces --include-workspace-root

# run both servers (backend :3000, frontend :5173)
npm run dev
```

Then open <http://localhost:5173> in two browser windows (or two devices on
your LAN — `vite` is configured with `host: true`).

If `npm-run-all` is unavailable, open two terminals:

```bash
# terminal 1
npm --workspace backend run dev

# terminal 2
npm --workspace frontend run dev
```

### Environment

The backend reads from `.env` (see `backend/.env.example`).

```env
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
RATE_LIMIT_EVENTS_PER_SEC=25
```

The frontend reads `VITE_SERVER_URL` (defaults to `http://localhost:3000`).

---

## How to use

1. **Open a room** — pick a room title, set a password, and you become the
   host. Share the password with friends out-of-band.
2. **Join an existing room** — same lobby form, "Join" tab.
3. **Load your reel** — every viewer chooses the same video file from their
   own drive. Pick the same file as the rest of the room — there's no
   server-side fingerprinting, so file matching is on the honor system.
4. **Watch** — the host's play/pause/seek/rate decisions broadcast to
   everyone instantly.
5. **Host privileges** — only the host can control playback by default. The
   host can toggle **Allow all to control** for open seating.

When a non-host viewer is started by a remote play event, their video begins
muted (browser autoplay policy) — a "Sound off · tap for audio" chip lets
them restore sound with one click.

---

## Project layout

```
.
├── backend/
│   ├── server.js             # Express + Socket.IO bootstrap
│   ├── socket/               # Socket event wiring
│   ├── rooms/                # In-memory room store (abstracted for Redis)
│   ├── controllers/          # Room create/join/leave + projectRoom()
│   ├── middleware/           # Per-socket rate limiter
│   ├── utils/                # Input sanitization + payload validators
│   └── package.json
│
└── frontend/
    ├── index.html
    ├── tailwind.config.js    # Cinema-noir theme tokens
    ├── src/
    │   ├── components/       # VideoPlayer, ChatPanel, UsersList, ...
    │   ├── hooks/            # useSocket, useVideoSync
    │   ├── pages/            # Home (lobby), Room
    │   ├── context/          # AppContext (toasts, identity)
    │   ├── services/         # Socket singleton
    │   └── utils/            # formatTime
    └── package.json
```

---

## Feature checklist

- [x] Create / join rooms with password
- [x] No duplicate room names; rooms auto-destroyed when empty
- [x] Connected users count + viewer list
- [x] Local file loading (HTML5 video, no upload)
- [x] Play / pause / seek / playback-rate sync (event-driven, no drift loop)
- [x] Late-join projection — server projects playhead forward at read time
- [x] Muted-autoplay fallback for non-host first play
- [x] Host promotion (longest-tenured user when host leaves)
- [x] "Allow all to control" host toggle
- [x] Anti-loop flag — remote events never re-emit
- [x] Reconnect recovery (re-join with stored credentials, playback snapshot)
- [x] Room chat (in-memory, transient)
- [x] Subtitle support (.vtt) — local-only, per viewer
- [x] Activity log
- [x] Copy invite link
- [x] Toast notifications
- [x] Modern dark cinematic UI (Tailwind, custom theme)
- [x] Rate limiting + payload sanitization + validators
- [x] Modular backend, abstract room store, CORS / env / port configurable

---

## Socket event reference

### Client → Server

| Event           | Payload                                          |
|-----------------|---------------------------------------------------|
| `create-room`   | `{ name, password, userName }` (with ack)         |
| `join-room`     | `{ name, password, userName }` (with ack)         |
| `leave-room`    | `{}`                                              |
| `play`          | `{ currentTime }`                                 |
| `pause`         | `{ currentTime }`                                 |
| `seek`          | `{ currentTime }`                                 |
| `playback-rate` | `{ playbackRate }`                                |
| `sync-state`    | `{}` (with ack — returns projected room state)    |
| `toggle-control`| `{ allowAll: boolean }`                           |
| `chat-message`  | `{ text }`                                        |
| `rename`        | `{ userName }`                                    |

### Server → Client

`room-state`, `remote-play`, `remote-pause`, `remote-seek`, `remote-rate`,
`user-connected`, `user-disconnected`, `host-change`, `control-toggled`,
`chat-message`, `activity`, `error-message`.

---

## End-to-end test

A Playwright script under `tests/e2e/sync.mjs` drives two real Chromium
contexts (host + peer), creates / joins a room, loads the same video on
both, and asserts that host play / pause / seek mirror on the peer.

```bash
# from repo root
PORT=3899 CLIENT_ORIGIN=http://localhost:5199 node backend/server.js &
cd frontend && VITE_SERVER_URL=http://localhost:3899 npx vite --port 5199 --strictPort &
cd .. && node tests/e2e/sync.mjs
```

---

## Where to go next (post-MVP)

**Persistence & scale**

- Swap `rooms/roomStore.js` for a Redis-backed adapter (`HSET` per room,
  pub/sub for cross-instance broadcast). The store interface is isolated so
  call sites won't change.
- Run the Node process behind a load balancer and use
  `@socket.io/redis-adapter` so rooms can span multiple instances.

**Stronger sync model**

- Add NTP-style clock-skew calibration (ping/pong) so the server's
  `updatedAt`-based projection accounts for one-way network latency.
- Per-event monotonically-increasing version numbers to reject out-of-order
  remote events.

**Production deployment**

- Frontend → static hosting (Vercel, Netlify, Cloudflare Pages).
- Backend → Fly.io / Railway / a single Node container. Sticky sessions if
  you scale horizontally without the Redis adapter; otherwise either works.
- Add Helmet, stricter CORS, and an HTTP-level rate limiter.

**WebRTC possibilities**

- Voice / video chat over a mesh of `RTCPeerConnection`s while the server
  continues to be the playback authority.
- Data-channel sync messages for sub-100ms latency between trusted peers
  (the server still arbitrates membership and host).

---

## License

MIT — do whatever you want with it; attribution appreciated.
