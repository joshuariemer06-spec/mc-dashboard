import React, { useEffect, useState } from 'react';

export default function FloatingCopilot({ access }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [msgs, setMsgs] = useState([
    { role: 'assistant', text: 'Hi! Ich bin dein Server-Copilot. Frag z.B.: „Warum laggt mein Server?“' }
  ]);
  const [logSummary, setLogSummary] = useState(null);
  const [cfgSummary, setCfgSummary] = useState(null);

  async function loadAnalyses() {
    const [a, b] = await Promise.all([
      fetch('/api/ai/analyze/logs', { headers: { Authorization: `Bearer ${access}` } }).then(r=>r.json()),
      fetch('/api/ai/analyze/config', { headers: { Authorization: `Bearer ${access}` } }).then(r=>r.json())
    ]);
    setLogSummary(a);
    setCfgSummary(b);
  }

  useEffect(() => { loadAnalyses(); }, []);

  async function ask() {
    const question = q.trim();
    if (!question) return;
    setQ('');
    setMsgs(m => [...m, { role: 'user', text: question }]);

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${access}` },
      body: JSON.stringify({ question })
    });
    const json = await res.json();
    setMsgs(m => [...m, { role: 'assistant', text: json.answer || 'Keine Antwort.' }]);
  }

  return (
    <>
      <button
        onClick={() => setOpen(o=>!o)}
        className="fixed bottom-5 right-5 rounded-full w-14 h-14 neon bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-center text-xl z-50"
        title="AI Copilot"
      >
        🤖
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 w-[360px] max-w-[90vw] rounded-2xl border neon bg-[hsl(var(--card))] border-[hsl(var(--border))] z-50 overflow-hidden">
          <div className="p-4 border-b border-[hsl(var(--border))]">
            <div className="font-semibold">Server Copilot</div>
            <div className="text-xs opacity-70">Log- & Config-Analyse integriert</div>
          </div>

          <div className="p-3 h-72 overflow-auto space-y-2">
            {msgs.map((m, idx) => (
              <div key={idx} className={`text-sm rounded-xl p-3 border border-[hsl(var(--border))] ${m.role==='user' ? 'bg-black/10' : 'bg-transparent'}`}>
                <div className="text-xs opacity-70 mb-1">{m.role}</div>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[hsl(var(--border))] flex gap-2">
            <input value={q} onChange={e=>setQ(e.target.value)}
              className="flex-1 rounded-xl border p-2 bg-transparent border-[hsl(var(--border))]"
              placeholder="Frag den Copilot..." />
            <button onClick={ask} className="px-3 rounded-xl neon bg-black/10 hover:bg-black/20">Send</button>
          </div>

          <div className="p-3 text-xs opacity-70 border-t border-[hsl(var(--border))]">
            Quick Checks: {cfgSummary?.issues?.length ? `Config Issues: ${cfgSummary.issues.length}` : 'Config ok'} ·
            {logSummary?.errorCount != null ? ` Errors: ${logSummary.errorCount}` : ' Log n/a'}
          </div>
        </div>
      )}
    </>
  );
}
