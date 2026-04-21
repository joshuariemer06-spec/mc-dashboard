import fs from 'fs';
import path from 'path';

export function readServerProperties(mcDir) {
  const file = path.join(mcDir, 'server.properties');
  const raw = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = raw.split('
');

  const entries = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      entries.push({ type: 'comment', raw: line });
      continue;
    }
    const idx = line.indexOf('=');
    if (idx === -1) {
      entries.push({ type: 'comment', raw: line });
      continue;
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    entries.push({ type: 'kv', key, value });
  }

  return { raw, entries };
}

export function inferType(value) {
  const v = value.toLowerCase();
  if (v === 'true' || v === 'false') return { kind: 'boolean', parsed: v === 'true' };
  if (/^-?\d+$/.test(value)) return { kind: 'number', parsed: Number(value) };
  return { kind: 'string', parsed: value };
}

export function toObject(entries) {
  const obj = {};
  for (const e of entries) if (e.type === 'kv') obj[e.key] = e.value;
  return obj;
}

export function writeServerProperties(mcDir, existingEntries, newMap) {
  const file = path.join(mcDir, 'server.properties');

  const used = new Set();
  const out = existingEntries.map(e => {
    if (e.type !== 'kv') return e.raw;
    if (Object.prototype.hasOwnProperty.call(newMap, e.key)) {
      used.add(e.key);
      return `${e.key}=${newMap[e.key]}`;
    }
    return `${e.key}=${e.value}`;
  });

  for (const [k, v] of Object.entries(newMap)) {
    if (!used.has(k)) out.push(`${k}=${v}`);
  }

  fs.writeFileSync(file, out.join('
').replace(/
{3,}/g, '

') + '
', 'utf8');
}
