import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Login() {
  const nav = useNavigate();
  const { setSession } = useAuth();
  const { theme, setTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();
    if (!res.ok) return setErr(json.error || 'Login fehlgeschlagen');
    setSession({ access: json.access, refresh: json.refresh, user: json.user });
    nav('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 neon bg-[hsl(var(--card))] border-[hsl(var(--border))] animate-glow">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Minecraft Dashboard</h1>
          <button
            className="text-sm px-3 py-1 rounded-full border border-[hsl(var(--border))]"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <p className="text-sm opacity-80 mb-6">Login mit JWT + Rollen. (Erster registrierter User wird Admin.)</p>

        <form onSubmit={submit} className="space-y-3">
          <input className="w-full rounded-xl border p-3 bg-transparent border-[hsl(var(--border))]"
            placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
          <input className="w-full rounded-xl border p-3 bg-transparent border-[hsl(var(--border))]"
            placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          {err && <div className="text-red-400 text-sm">{err}</div>}
          <button className="w-full rounded-xl p-3 font-medium neon bg-black/10 hover:bg-black/20">
            Einloggen
          </button>
        </form>

        <div className="text-sm mt-4 opacity-80">
          Kein Konto? <Link className="underline" to="/register">Registrieren</Link>
        </div>
      </div>
    </div>
  );
}
