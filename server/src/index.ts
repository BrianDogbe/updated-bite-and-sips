// Bite & Sips API — Express + SQLite + Socket.IO.
// Run: npm run dev (needs server/.env — copy from .env.example)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { ensureSchema, seedIfEmpty } from './db.js';
import { setIO } from './realtime.js';
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import messageRoutes from './routes/messages.js';
import opsRoutes from './routes/ops.js';

const PORT = Number(process.env.PORT ?? 4000);
const ORIGINS = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim());

ensureSchema();
seedIfEmpty();

const app = express();
app.use(cors({ origin: ORIGINS, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  const mock = !process.env.PAYSTACK_SECRET_KEY && !process.env.MOMO_SUBSCRIPTION_KEY;
  res.json({ ok: true, payments: mock ? 'MOCK' : 'LIVE', maps: 'MOCK', realtime: 'socket.io' });
});

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api', opsRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const http = createServer(app);
const io = new Server(http, { cors: { origin: ORIGINS } });
setIO(io);
io.on('connection', (socket) => {
  socket.on('rider:location', (p: { riderId: string; orderId: string; lat: number; lng: number }) => {
    io.emit('RIDER_LOCATION', { type: 'RIDER_LOCATION', ...p, at: new Date().toISOString() });
  });
});

http.listen(PORT, () => {
  console.log(`Bite & Sips API on :${PORT} (payments: ${process.env.PAYSTACK_SECRET_KEY || process.env.MOMO_SUBSCRIPTION_KEY ? 'LIVE' : 'MOCK'})`);
});
