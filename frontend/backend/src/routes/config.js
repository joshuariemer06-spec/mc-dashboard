import express from 'express';
import { requireRole } from '../services/auth.js';
import { readServerProperties, toObject, writeServerProperties, inferType } from '../services/propertiesFile.js';

export const configRouter = express.Router();
const MC_DIR = process.env.MC_DIR || '/srv/mc';

const sensitiveKeys = new Set([
  'rcon.password',
  'management-server-secret',
  'management-server-tls-keystore-password'
]);

configRouter.get('/server-properties', (req, res) => {
  const { entries } = readServerProperties(MC_DIR);
  const map = toObject(entries);

  const typed = Object.entries(map).map(([key, value]) => {
    const inf = inferType(value);
    const masked = (req.user?.role !== 'Admin' && sensitiveKeys.has(key)) ? '••••••••' : value;
    return { key, value: masked, kind: inf.kind, sensitive: sensitiveKeys.has(key) };
  });

  res.json({ items: typed });
});

configRouter.put('/server-properties', requireRole('Admin'), (req, res) => {
  const updates = req.body?.updates;
  if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'Invalid updates' });

  const { entries } = readServerProperties(MC_DIR);
  const clean = {};

  for (const [k, v] of Object.entries(updates)) {
    const key = String(k).trim();
    const val = String(v).trim();
    if (!key || key.length > 80) continue;
    if (val.length > 400) continue;
    clean[key] = val;
  }

  writeServerProperties(MC_DIR, entries, clean);
  res.json({ ok: true });
});
