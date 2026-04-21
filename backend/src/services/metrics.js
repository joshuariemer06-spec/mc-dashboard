import os from 'os';
import pidusage from 'pidusage';
import { sendCommand } from './rcon.js';
import { getPid, isRunning } from './mcProcess.js';

export async function getHostMetrics() {
  return {
    memTotal: os.totalmem(),
    memFree: os.freemem(),
    load1: os.loadavg()[0],
    cpus: os.cpus().length
  };
}

export async function getProcessMetrics() {
  if (!isRunning() || !getPid()) return null;
  const stat = await pidusage(getPid());
  return { cpu: stat.cpu, memory: stat.memory };
}

function parseTps(text) {
  const nums = (text.match(/(\d+(\.\d+)?)/g) || []).map(Number).filter(n => n >= 0 && n <= 20.5);
  return { tps1: nums[0] ?? null, tps5: nums[1] ?? null, tps15: nums[2] ?? null };
}

function parseList(text) {
  const match = text.match(/There are\s+(\d+)\s+of a max of\s+(\d+)/i);
  const online = match ? Number(match[1]) : null;
  const max = match ? Number(match[2]) : null;
  return { online, max };
}

export async function getServerMetrics() {
  try {
    const [tpsRaw, msptRaw, listRaw] = await Promise.all([
      sendCommand('tps'),
      sendCommand('mspt'),
      sendCommand('list')
    ]);
    return {
      tps: parseTps(tpsRaw),
      msptRaw,
      players: parseList(listRaw),
      raw: { tpsRaw, listRaw }
    };
  } catch (e) {
    return { error: 'RCON metrics failed', details: String(e?.message || e) };
  }
}
