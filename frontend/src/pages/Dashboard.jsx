import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import FloatingCopilot from '../components/FloatingCopilot.jsx';
import SetupWizard from '../components/SetupWizard.jsx';

function fmtBytes(n) {
  if (n == null) return '-';
  const u = ['B','KB','MB','GB','TB'];
  let i=0, v=n;
  while (v>1024 && i<u.length-1) { v/=1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}

export default function Dashboard() {
  const { access, user, clear } = useAuth();
  const { theme, setTheme } = useTheme();
  const wsRef = useRef(null);

  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [cmd, setCmd] = useState('');
  const [tpsSeries, setTpsSeries] = useState([]);
  const [notifies, setNotifies] = useState([]);

  const isAdmin = user?.role === 'Admin';

  async function loadStatus() {
    const res = await fetch('/api/server/status', {
      headers: { Authorization: `Bearer ${access}` }
    });
    const json = await res.json();
    setStatus(json);
    const tps1 = json?.server?.tps?.tps1 ?? null;
    if (tps1 != null) {
      setTpsSeries(s => [...s.slice(-60), { t: Date.now(), tps: tps1 }]);
    }
  }

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 2500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`${location.origin.replace('http','ws')}/ws`);
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token: access }));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'log') setLogs(l => [...l.slice(-800), msg.line]);
      if (msg.type === 'console') setLogs(l => [...l.slice(-800), String(msg.line).trimEnd()]);
      if (msg.type === 'notify') setNotifies(n => [...n.slice(-6), { ...msg, id: crypto.randomUUID() }]);
    };
    return () => ws.close();
  }, [access]);

  async function serverAction(action) {
    const res = await fetch(`/api/server/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}` }
    });
    const json = await res.json();
    if (!res.ok) alert(json.error || 'Fehler');
  }

  async function sendCommand() {
    const c = cmd.trim();
    if (!c) return;
    setCmd('');
    const res = await fetch('/api/server/command', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${access}` },
      body: JSON.stringify({ cmd: c })
    });
    const json = await res.json();
    if (!res.ok) alert(json.error || 'Command fehlgeschlagen');
  }

  const online = status?.server?.players?.online ?? '-';
  const max = status?.server?.players?.max ?? '-';
  const tps1 = status?.server?.tps?.tps1 ?? '-';
  const cpu = status?.proc?.cpu != null ? `${status.proc.cpu.toFixed(1)}%` : '-';
  const ram = status?.proc?.memory != null ? fmtBytes(status.proc.memory) : '-';
  const running = status?.running;

  return (
    <div className="min-h-screen p-6">
      <SetupWizard access={access} isAdmin={isAdmin} onDone={loadStatus} />

      {!!notifies.length && (
        <div className="fixed top-4 right-4 space-y-2 z-50">
          {notifies.map(n => (
            <div key={n.id} className="rounded-xl px-4 py-3 neon border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <div className="text-sm font-medium">{n.level?.toUpperCase() || 'INFO'}</div>
              <div className="text-sm opacity-80">{n.message}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Dashboard</div>
          <div className="text-sm opacity-80">Angemeldet als {user?.username} ({user?.role})</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-sm px-3 py-2 rounded-xl border border-[hsl(var(--border))]"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button onClick={clear} className="px-4 py-2 rounded-xl border border-[hsl(var(--border))]">Logout</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-5 neon bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <div className="text-sm opacity-80">Serverstatus</div>
          <div className="text-3xl font-semibold mt-1">{running ? '🟢 ONLINE' : '🔴 OFFLINE'}</div>
          <div className="mt-4 flex gap-2 flex-wrap">
            <button disabled={!isAdmin} onClick={()=>serverAction('start')}
              className="px-4 py-2 rounded-xl neon bg-black/10 hover:bg-black/20 disabled:opacity-40">▶️ Start</button>
            <button disabled={!isAdmin} onClick={()=>serverAction('stop')}
              className="px-4 py-2 rounded-xl neon bg-black/10 hover:bg-black/20 disabled:opacity-40">⏹ Stop</button>
            <button disabled={!isAdmin} onClick={()=>serverAction('restart')}
              className="px-4 py-2 rounded-xl neon bg-black/10 hover:bg-black/20 disabled:opacity-40">🔄 Restart</button>
          </div>
          {!isAdmin && <div className="text-xs opacity-70 mt-2">Nur Admin kann Server steuern.</div>}
        </div>

        <div className="rounded-2xl border p-5 neon bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <div className="text-sm opacity-80">Live Werte</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border p-3 border-[hsl(var(--border))]">
              <div className="opacity-70">Spieler</div>
              <div className="text-xl font-semibold">{online} / {max}</div>
            </div>
            <div className="rounded-xl border p-3 border-[hsl(var(--border))]">
              <div className="opacity-70">TPS (1m)</div>
              <div className="text-xl font-semibold">{tps1}</div>
            </div>
            <div className="rounded-xl border p-3 border-[hsl(var(--border))]">
              <div className="opacity-70">CPU (MC Prozess)</div>
              <div className="text-xl font-semibold">{cpu}</div>
            </div>
            <div className="rounded-xl border p-3 border-[hsl(var(--border))]">
              <div className="opacity-70">RAM (MC Prozess)</div>
              <div className="text-xl font-semibold">{ram}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-5 neon bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <div className="text-sm opacity-80">TPS Chart</div>
          <div className="h-44 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tpsSeries}>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 20]} />
                <Tooltip />
                <Line type="monotone" dataKey="tps" stroke="hsl(var(--accent))" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="rounded-2xl border p-5 neon bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <div>
            <div className="text-lg font-semibold">Live Konsole</div>
            <div className="text-xs opacity-70">Logs in Echtzeit + Command Input (Admin)</div>
          </div>

          <div className="mt-3 h-80 overflow-auto rounded-xl border border-[hsl(var(--border))] p-3 font-mono text-xs whitespace-pre-wrap">
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>

          <div className="mt-3 flex gap-2">
            <input value={cmd} onChange={e=>setCmd(e.target.value)} className="flex-1 rounded-xl border p-3 bg-transparent border-[hsl(var(--border))]"
              placeholder="Befehl (z.B. list, say hi, tps)" />
            <button disabled={!isAdmin} onClick={sendCommand}
              className="px-4 py-2 rounded-xl neon bg-black/10 hover:bg-black/20 disabled:opacity-40">
              Senden
            </button>
          </div>
        </div>

        <ServerPropertiesPanel access={access} isAdmin={isAdmin} />
      </div>

      <FloatingCopilot access={access} />
    </div>
  );
}

function ServerPropertiesPanel({ access, isAdmin }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [dirty, setDirty] = useState({});

  async function load() {
    const res = await fetch('/api/config/server-properties', { headers: { Authorization: `Bearer ${access}` }});
    const json = await res.json();
    setItems(json.items || []);
  }

  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return items.filter(i => !f || i.key.toLowerCase().includes(f));
  }, [items, filter]);

  function setVal(key, value) {
    setDirty(d => ({ ...d, [key]: value }));
  }

  async function save() {
    if (!isAdmin) return;
    const updates = { ...dirty };
    const res = await fetch('/api/config/server-properties', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${access}` },
      body: JSON.stringify({ updates })
    });
    const json = await res.json();
    if (!res.ok) return alert(json.error || 'Save failed');
    setDirty({});
    await load();
    alert('Gespeichert. (Restart nötig für viele Keys)');
  }

  return (
    <div className="rounded-2xl border p-5 neon bg-[hsl(var(--card))] border-[hsl(var(--border))]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">server.properties</div>
          <div className="text-xs opacity-70">Boolean/Number/Text + Secrets maskiert für Non-Admin</div>
        </div>
        <button disabled={!isAdmin || Object.keys(dirty).length===0} onClick={save}
          className="px-4 py-2 rounded-xl neon bg-black/10 hover:bg-black/20 disabled:opacity-40">
          Speichern
        </button>
      </div>

      <input value={filter} onChange={e=>setFilter(e.target.value)}
        className="w-full mt-3 rounded-xl border p-3 bg-transparent border-[hsl(var(--border))]"
        placeholder="Suche (z.B. rcon, view-distance)" />

      <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-[hsl(var(--border))]">
        {shown.map(({ key, value, kind, sensitive }) => {
          const v = (dirty[key] ?? value);
          return (
            <div key={key} className="flex items-center gap-3 p-3 border-b border-[hsl(var(--border))]">
              <div className="w-56 text-sm font-mono">{key}</div>
              <div className="flex-1">
                {kind === 'boolean' ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={String(v).toLowerCase() === 'true'}
                      onChange={(e) => setVal(key, e.target.checked ? 'true' : 'false')}
                      disabled={sensitive && !isAdmin}
                    />
                    <span className="opacity-80">{String(v)}</span>
                  </label>
                ) : (
                  <input
                    className="w-full rounded-xl border p-2 bg-transparent border-[hsl(var(--border))] text-sm"
                    value={v}
                    onChange={(e) => setVal(key, e.target.value)}
                    disabled={sensitive && !isAdmin}
                  />
                )}
              </div>
              <div className="w-24 text-xs opacity-70 flex items-center justify-end gap-2">
                <span>{kind}</span>
                {sensitive ? <span title="Sensitive">🔒</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
