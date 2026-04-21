import express from 'express';
import { analyzeLog, analyzeConfig } from '../ai/analyzers.js';
import { llmChat } from '../ai/llm.js';

export const aiRouter = express.Router();
const MC_DIR = process.env.MC_DIR || '/srv/mc';

aioRouter.get('/analyze/logs', (req, res) => {
  res.json(analyzeLog(MC_DIR));
});

aioRouter.get('/analyze/config', (req, res) => {
  const cfg = analyzeConfig(MC_DIR);
  // remove snapshot for non-admins (avoid leaking secrets)
  if (req.user?.role !== 'Admin') {
    return res.json({ issues: cfg.issues });
  }
  res.json(cfg);
});

aioRouter.post('/chat', async (req, res) => {
  const question = String(req.body?.question || '').trim();
  if (!question) return res.status(400).json({ error: 'Missing question' });

  const log = analyzeLog(MC_DIR);
  const cfg = analyzeConfig(MC_DIR);

  const system = `Du bist ein technischer Minecraft Paper Server Assistent. Antworte kurz, klar, lösungsorientiert. Nutze Log- und Config-Signale. Gib konkrete Schritte.`;

  const fallback = () => {
    const hints = [];
    if (cfg.issues.some(i => i.title.includes('RCON'))) hints.push('RCON ist nicht korrekt konfiguriert (enable-rcon / rcon.password).');
    if (log.issues.some(i => i.title.includes('Lag'))) hints.push('Log zeigt Lag ("Can't keep up!"): view-distance/simulation-distance senken, Plugins/Entities prüfen, mehr CPU/RAM.');
    if (log.issues.some(i => i.title.includes('OutOfMemory'))) hints.push('OutOfMemoryError: JAVA_XMX erhöhen oder Last reduzieren.');

    return {
      answer:
        `Kurzdiagnose:
- ${hints.join('
- ') || 'Keine eindeutigen Signale – prüfe latest.log, Plugins und Ressourcen.'}

Nächste Schritte:
1) /tps und /mspt prüfen
2) view-distance/simulation-distance testen
3) Plugins schrittweise deaktivieren
4) Server neu starten`
    };
  };

  try {
    const llm = await llmChat({
      system,
      messages: [
        { role: 'user', content: question },
        { role: 'user', content: `Log-Summary: ${JSON.stringify(log)}` },
        { role: 'user', content: `Config-Issues: ${JSON.stringify(cfg.issues)}` }
      ]
    });

    if (!llm) return res.json(fallback());
    return res.json({ answer: llm });
  } catch {
    return res.json(fallback());
  }
});
