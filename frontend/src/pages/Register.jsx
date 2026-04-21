import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();
    if (!res.ok) return setErr(json.error?.fieldErrors ? 'Ungültige Eingaben' : (json.error || 'Registrierung fehlgeschlagen'));
    nav('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 neon bg-[hsl(var(--card))] border-[hsl(var(--border))] animate-glow">
        <h1 className="text-2xl font-semibold mb-2">Registrieren</h1>
        <p className="text-sm opacity-80 mb-6">Der erste registrierte Nutzer wird automatisch Admin (Bootstrap).</p>

        <form onSubmit={submit} className="space-y-3">
          <input className="w-full rounded-xl border p-3 bg-transparent border-[hsl(var(--border))]"
            placeholder="Username (a-z, 0-9, _)" value={username} onChange={e=>setUsername(e.target.value)} />
          <input className="w-full rounded-xl border p-3 bg-transparent border-[hsl(var(--border))]"
            placeholder="Passwort (min 8)" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          {err && <div className="text-red-400 text-sm">{err}</div>}
          <button className="w-full rounded-xl p-3 font-medium neon bg-black/10 hover:bg-black/20">
            Konto erstellen
          </button>
        </form>

        <div className="text-sm mt-4 opacity-80">
          Schon dabei? <Link className="underline" to="/login">Zum Login</Link>
        </div>
      </div>
    </div>
  );
}
