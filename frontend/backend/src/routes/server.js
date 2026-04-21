import express from 'express';
import crypto from 'crypto';
import { requireRole } from '../services/auth.js';
import { startServer, stopServerGraceful, isRunning, attachStdout } from '../services/mcProcess.js';
import { stopViaRcon, sendCommand, endRcon } from '../services/rcon.js';
import { getHostMetrics, getProcessMetrics, getServerMetrics } from '../services/metrics.js';
import { wsBroadcast } from '../websocket/wsServer.js';
import { analyzeConfig } from '../ai/analyzers.js';
import { readServerProperties, writeServerProperties, toObject } from '../services/propertiesFile.js';

export const serverRouter = express.Router();
const MC_DIR = process.env.MC_DIR || '/srv/mc';

let attached = false;

serverRouter.get('/status', async (req, res) => {
  const [host, proc, server] = await Promise.all([
    getHostMetrics(),
    getProcessMetrics(),
    getServerMetrics()
  ]);

  res.json({ running: isRunning(), host, proc, server });
});

serverRouter.get('/setup/status', (req, res) => {
  const cfg = analyzeConfig(MC_DIR);
  const needsFix = cfg.issues.some(i => i.level === 'error' && (i.title.includes('RCON') || i.title.includes('Passwort')));
  res.json({ needsFix, issues: cfg.issues });
});

function randomAlnum(len=24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf = crypto.randomBytes(len);
  let out='';
  for (let i=0;i<len;i++) out += chars[buf[i] % chars.length];
  return out;
}

serverRouter.post('/setup/auto-fix', requireRole('Admin'), (req, res) => {
  // Apply: enable-rcon=true, broadcast-rcon-to-ops=false, set rcon.password if empty or forced
  const forceNewPassword = !!req.body?.forceNewPassword;

  const { entries } = readServerProperties(MC_DIR);
  const map = toObject(entries);

  const updates = {
    'enable-rcon': 'true',
    'broadcast-rcon-to-ops': 'false'
  };

  const currentPw = (map['rcon.password'] || '').trim();
  if (!currentPw || forceNewPassword) {
    updates['rcon.password'] = randomAlnum(28);
  }

  writeServerProperties(MC_DIR, entries, updates);

  // Reset RCON client so next command uses updated password
  endRcon().catch(()=>{});

  wsBroadcast({ type: 'notify', level: 'success', message: 'Setup Fix angewendet (RCON aktiviert + Passwort gesetzt).' });
  res.json({ ok: true, applied: updates, note: 'Server-Restart nötig, damit Einstellungen sicher greifen.' });
});

serverRouter.post('/start', requireRole('Admin'), (req, res) => {
  try {
    const result = startServer(MC_DIR);
    if (!attached) {
      attachStdout((text) => wsBroadcast({ type: 'console', line: text }));
      attached = true;
    }
    wsBroadcast({ type: 'notify', level: 'success', message: 'Server start requested' });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

serverRouter.post('/stop', requireRole('Admin'), async (req, res) => {
  await stopServerGraceful(stopViaRcon);
  wsBroadcast({ type: 'notify', level: 'warning', message: 'Server stop requested' });
  res.json({ ok: true });
});

serverRouter.post('/restart', requireRole('Admin'), async (req, res) => {
  await stopServerGraceful(stopViaRcon);
  setTimeout(() => {
    try {
      startServer(MC_DIR);
      wsBroadcast({ type: 'notify', level: 'success', message: 'Server restart requested' });
    } catch (e) {
      wsBroadcast({ type: 'notify', level: 'error', message: String(e?.message || e) });
    }
  }, 1500);
  res.json({ ok: true });
});

serverRouter.post('/command', requireRole('Admin'), async (req, res) => {
  const cmd = String(req.body?.cmd || '').trim();
  if (!cmd || cmd.length > 200) return res.status(400).json({ error: 'Invalid command' });

  try {
    const out = await sendCommand(cmd);
    wsBroadcast({ type: 'console', line: `[RCON] ${cmd}
${out}
` });
    res.json({ ok: true, out });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});
