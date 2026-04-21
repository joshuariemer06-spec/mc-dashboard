import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { initDb } from './services/db.js';
import { authRouter } from './routes/auth.js';
import { serverRouter } from './routes/server.js';
import { configRouter } from './routes/config.js';
import { aiRouter } from './routes/ai.js';
import { requireAuth } from './services/auth.js';
import { createWsServer } from './websocket/wsServer.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

initDb();

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/server', requireAuth, serverRouter);
app.use('/api/config', requireAuth, configRouter);
app.use('/api/ai', requireAuth, aiRouter);

const server = app.listen(PORT, () => {
  console.log(`Backend listening on :${PORT}`);
});

createWsServer(server);
