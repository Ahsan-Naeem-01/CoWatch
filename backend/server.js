import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket/socketHandler.js';
import { roomStore } from './rooms/roomStore.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '32kb' }));

// Lightweight health / inspection endpoints — never expose room secrets.
app.get('/', (_req, res) => {
  res.json({ service: 'cowatch', status: 'ok', uptime: process.uptime() });
});

app.get('/api/rooms/count', (_req, res) => {
  res.json({ rooms: roomStore.size(), users: roomStore.userCount() });
});

app.get('/api/rooms/exists/:name', (req, res) => {
  const name = String(req.params.name || '').trim().toLowerCase();
  res.json({ exists: roomStore.exists(name) });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  pingInterval: 10_000,
  pingTimeout: 8_000,
});

registerSocketHandlers(io);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`\n  CoWatch sync server listening on :${PORT}`);
  console.log(`  Accepting client origin: ${CLIENT_ORIGIN}\n`);
});
