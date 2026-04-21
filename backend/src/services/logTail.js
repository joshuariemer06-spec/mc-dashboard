import fs from 'fs';
import path from 'path';

export function createLogTail(mcDir, onLine) {
  const logPath = path.join(mcDir, 'logs', 'latest.log');
  let position = 0;

  function readNew() {
    if (!fs.existsSync(logPath)) return;
    const stat = fs.statSync(logPath);
    if (stat.size < position) position = 0;
    if (stat.size === position) return;

    const fd = fs.openSync(logPath, 'r');
    const buf = Buffer.alloc(stat.size - position);
    fs.readSync(fd, buf, 0, buf.length, position);
    fs.closeSync(fd);
    position = stat.size;

    const text = buf.toString('utf8');
    text.split('
').forEach(line => {
      if (line.trim().length) onLine(line);
    });
  }

  const interval = setInterval(readNew, 800);
  return () => clearInterval(interval);
}
