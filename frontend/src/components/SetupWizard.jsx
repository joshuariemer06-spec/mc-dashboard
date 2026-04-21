import React, { useEffect, useState } from 'react';

export default function SetupWizard({ access, isAdmin, onDone }) {
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState([]);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(null);

  async function check() {
    const res = await fetch('/api/server/setup/status', { headers: { Authorization: `Bearer ${access}` } });
    const json = await res.json();
    setIssues(json.issues || []);
    setOpen(!!json.needsFix);
  }

  useEffect(() => { check(); }, []);

  async function applyFix() {
    setBusy(true);
    try {
      const res = await fetch('/api/server/setup/auto-fix', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${access}` },
        body: JSON.stringify({ forceNewPassword: false })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Fix fehlgeschlagen');
      setApplied(json.applied);
      // Restart to apply
      await fetch('/api/server/restart', { method: 'POST', headers: { Authorization: `Bearer ${access}` } });
      setOpen(false);
      onDone?.();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60">
      <div className="w-full max-w-2xl rounded-2xl border neon bg-[hsl(var(--card))] border-[hsl(var(--border))] overflow-hidden">
        <div className="p-5 border-b border-[hsl(var(--border))]">
          <div className="text-xl font-semibold">Ersteinrichtung: Dashboard-Ready Fix</div>
          <div className="text-sm opacity-80 mt-1">Wir haben Blocker gefunden. Mit einem Klick kann das Dashboard RCON aktivieren und ein Passwort setzen.</div>
        </div>

        <div className="p-5 space-y-3">
          <div className="text-sm font-medium">Gefundene Punkte:</div>
          <div className="space-y-2">
            {issues.map((i, idx) => (
              <div key={idx} className="rounded-xl border border-[hsl(var(--border))] p-3">
                <div className="text-sm font-semibold">{i.level?.toUpperCase()} — {i.title}</div>
                <div className="text-sm opacity-80 mt-1">{i.detail}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[hsl(var(--border))] p-3 text-sm opacity-80">
            Fix setzt: <span className="font-mono">enable-rcon=true</span>, <span className="font-mono">broadcast-rcon-to-ops=false</span> und generiert <span className="font-mono">rcon.password</span> falls leer. Danach wird automatisch ein Restart ausgelöst.
          </div>

          {!isAdmin && (
            <div className="text-sm text-red-300">Du bist kein Admin. Bitte melde dich als Admin an, um den Fix anzuwenden.</div>
          )}
        </div>

        <div className="p-5 border-t border-[hsl(var(--border))] flex items-center justify-end gap-2">
          <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-[hsl(var(--border))]">Später</button>
          <button disabled={!isAdmin || busy} onClick={applyFix}
            className="px-4 py-2 rounded-xl neon bg-black/10 hover:bg-black/20 disabled:opacity-40">
            {busy ? 'Wird angewendet…' : 'Fix anwenden & Restart'}
          </button>
        </div>
      </div>
    </div>
  );
}
