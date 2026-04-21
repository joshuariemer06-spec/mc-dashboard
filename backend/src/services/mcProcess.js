import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

let proc = null;
let lastStartAt = null;

export function isRunning() {
  return !!proc && !proc.killed;
}

export function getPid() {
  return proc?.pid || null;
}

export function getLastStartAt() {
  return lastStartAt;
}

export function ensureEula(mcDir) {
  if (process.env.ACCEPT_EULA === 'true') {
    const eulaPath = path.join(mcDir, 'eula.txt');
    fs.writeFileSync(eulaPath, 'eula=true
', 'utf8');
  }
}

export function startServer(mcDir) {
  if (isRunning()) return { ok: true, already: true };

  ensureEula(mcDir);
  const script = path.join(mcDir, 'start.sh');
  if (!fs.existsSync(script)) throw new Error(`start.sh not found at ${script}`);

  proc = spawn('bash', [script], {
    cwd: mcDir,
    env: {
      ...process.env,
      JAVA_XMS: process.env.JAVA_XMS || '1G',
      JAVA_XMX: process.env.JAVA_XMX || '2G'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  lastStartAt = new Date().toISOString();
  return { ok: true, pid: proc.pid };
}

export async function stopServerGraceful(sendRconStop) {
  if (!isRunning()) return { ok: true, already: true };
  try {
    await sendRconStop();
  } catch {
    try { proc.stdin.write('stop
'); } catch {}
  }
  return { ok: true };
}

export function killServer() {
  if (!isRunning()) return { ok: true, already: true };
  proc.kill('SIGKILL');
  return { ok: true };
}

export function attachStdout(onData) {
  if (!proc) return;
  proc.stdout.on('data', (d) => onData(d.toString('utf8')));
  proc.stderr.on('data', (d) => onData(d.toString('utf8')));
  proc.on('exit', () => onData('[PROCESS] Server stopped.
'));
}
