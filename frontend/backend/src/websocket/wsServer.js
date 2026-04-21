import { WebSocketServer } from 'ws';
import { verifyAccessToken } from '../services/auth.js';
import { createLogTail } from '../services/logTail.js';

const clients = new Set();

export function wsBroadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

export function createWsServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let data;
      try { data = JSON.parse(raw.toString('utf8')); } catch { return; }

      if (data.type === 'auth') {
        try {
          const token = String(data.token || '');
          const user = verifyAccessToken(token);
          ws.user = user;
          clients.add(ws);
          ws.send(JSON.stringify({ type: 'hello', user }));
          wsBroadcast({ type: 'presence', onlineDashboards: clients.size });
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Auth failed' }));
        }
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      wsBroadcast({ type: 'presence', onlineDashboards: clients.size });
    });
  });

  // Tail latest.log -> WS
  const mcDir = process.env.MC_DIR || '/srv/mc';
  createLogTail(mcDir, (line) => {
    wsBroadcast({ type: 'log', line });

    if (/joined the game/i.test(line)) wsBroadcast({ type: 'notify', level: 'info', message: 'Spieler ist beigetreten' });
    if (/left the game/i.test(line)) wsBroadcast({ type: 'notify', level: 'info', message: 'Spieler hat verlassen' });
    if (/ERROR/i.test(line) || /Exception/i.test(line)) wsBroadcast({ type: 'notify', level: 'error', message: 'Fehler im Log erkannt' });
  });
}
