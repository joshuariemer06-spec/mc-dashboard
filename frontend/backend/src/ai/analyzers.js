import fs from 'fs';
import path from 'path';
import { readServerProperties, toObject } from '../services/propertiesFile.js';

export function analyzeLog(mcDir) {
  const file = path.join(mcDir, 'logs', 'latest.log');
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = text.split('
').slice(-4000);

  const issues = [];
  const tail = lines.slice(-250).join('
');

  const errorCount = lines.filter(l => /ERROR/.test(l) || /Exception/.test(l)).length;
  const warnCount = lines.filter(l => /WARN/.test(l)).length;

  if (/Can't keep up!/.test(text)) {
    issues.push({
      level: 'warn',
      title: 'Server kommt nicht hinterher (Lag)',
      detail: 'Im Log wurde "Can't keep up!" gefunden. Typisch: zu wenig CPU, hohe view-distance, zu viele Entities/Plugins.'
    });
  }

  if (/FAILED TO BIND TO PORT|Address already in use/i.test(text)) {
    issues.push({
      level: 'error',
      title: 'Port bereits belegt',
      detail: 'Der Server kann den Port nicht binden (Address already in use). Prüfe Port-Mapping/anderen Prozess.'
    });
  }

  if (/OutOfMemoryError/i.test(text)) {
    issues.push({
      level: 'error',
      title: 'OutOfMemoryError',
      detail: 'Der Java Heap ist voll. Erhöhe JAVA_XMX oder reduziere Last (Sichtweite/Plugins/Entities).'
    });
  }

  if (/Crash Report|---- Minecraft Crash Report ----/.test(text)) {
    issues.push({
      level: 'error',
      title: 'Crash Report erkannt',
      detail: 'Crash Report erkannt. Prüfe Stacktrace/Plugins/Versionen.'
    });
  }

  return { errorCount, warnCount, issues, tailPreview: tail };
}

export function analyzeConfig(mcDir) {
  const { entries } = readServerProperties(mcDir);
  const map = toObject(entries);

  const issues = [];

  if ((map['enable-rcon'] || '').toLowerCase() !== 'true') {
    issues.push({
      level: 'error',
      title: 'RCON ist deaktiviert (enable-rcon=false)',
      detail: 'Für Dashboard-Kommandos/Metriken muss enable-rcon=true gesetzt werden.'
    });
  }

  const pw = (map['rcon.password'] || '').trim();
  if (!pw) {
    issues.push({
      level: 'error',
      title: 'RCON Passwort fehlt (rcon.password leer)',
      detail: 'Setze ein starkes zufälliges Passwort; ohne Passwort kann das Dashboard nicht verbinden.'
    });
  } else if (pw.length < 12) {
    issues.push({
      level: 'warn',
      title: 'RCON Passwort wirkt schwach',
      detail: 'Nutze ein langes, zufälliges Passwort (RCON gibt vollen Konsolen-Zugriff).'
    });
  }

  if ((map['broadcast-rcon-to-ops'] || '').toLowerCase() === 'true') {
    issues.push({
      level: 'warn',
      title: 'broadcast-rcon-to-ops=true',
      detail: 'Empfehlung: broadcast-rcon-to-ops=false, damit RCON-Ausgaben nicht an Ops gespiegelt werden.'
    });
  }

  const vd = Number(map['view-distance'] || '10');
  if (!Number.isNaN(vd) && vd >= 16) {
    issues.push({
      level: 'warn',
      title: 'view-distance ist hoch',
      detail: `view-distance=${vd} kann Performance kosten. Bei Lag testweise senken (z.B. 8-12).`
    });
  }

  const sim = Number(map['simulation-distance'] || '10');
  if (!Number.isNaN(sim) && sim >= 12) {
    issues.push({
      level: 'warn',
      title: 'simulation-distance ist relativ hoch',
      detail: `simulation-distance=${sim} erhöht Tick-Last. Bei Lag senken.`
    });
  }

  if ((map['management-server-enabled'] || '').toLowerCase() !== 'true' && (map['management-server-secret'] || '').trim()) {
    issues.push({
      level: 'info',
      title: 'Management-Server ist deaktiviert (optional)',
      detail: 'Du hast bereits ein management-server-secret gesetzt. Dieses Protokoll kann optional aktiviert werden.'
    });
  }

  return { issues, snapshot: map };
}
