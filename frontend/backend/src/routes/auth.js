import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import { getDb } from '../services/db.js';
import { signAccessToken, requireAuth, getUserById, getUserByUsername, getUserCount } from '../services/auth.js';

export const authRouter = express.Router();

const RegisterSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(72)
});

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

function nowIso() { return new Date().toISOString(); }
function addDays(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString(); }

// First registered user becomes Admin (bootstrap)
authRouter.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { username, password } = parsed.data;
  const db = getDb();

  const exists = getUserByUsername(username);
  if (exists) return res.status(409).json({ error: 'Username already exists' });

  const hash = await bcrypt.hash(password, 12);
  const role = (getUserCount() === 0) ? 'Admin' : 'User';

  const info = db.prepare(
    'INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)'
  ).run(username, hash, role, nowIso());

  const user = { id: info.lastInsertRowid, username, role };
  const access = signAccessToken(user);

  return res.json({ access, user });
});

authRouter.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { username, password } = parsed.data;
  const user = getUserByUsername(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const access = signAccessToken(user);
  const refresh = crypto.randomBytes(48).toString('hex');

  const db = getDb();
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).run(user.id, refresh, nowIso(), addDays(30));

  return res.json({
    access,
    refresh,
    user: { id: user.id, username: user.username, role: user.role }
  });
});

authRouter.post('/refresh', (req, res) => {
  const RefreshSchema = z.object({ refresh: z.string().min(10) });
  const parsed = RefreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { refresh } = parsed.data;
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM refresh_tokens WHERE token = ? AND revoked_at IS NULL'
  ).get(refresh);

  if (!row) return res.status(401).json({ error: 'Invalid refresh token' });
  if (new Date(row.expires_at).getTime() < Date.now()) return res.status(401).json({ error: 'Expired refresh token' });

  const user = getUserById(row.user_id);
  if (!user) return res.status(401).json({ error: 'Invalid user' });

  const access = signAccessToken(user);
  return res.json({ access, user: { id: user.id, username: user.username, role: user.role } });
});

authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});
