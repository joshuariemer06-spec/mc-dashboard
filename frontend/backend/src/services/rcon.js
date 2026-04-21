import { Rcon } from 'rcon-client';
import { readServerProperties, toObject } from './propertiesFile.js';
import path from 'path';

let client = null;

function resolveRconPassword() {
  if (process.env.RCON_PASSWORD && process.env.RCON_PASSWORD.trim()) return process.env.RCON_PASSWORD.trim();
  const mcDir = process.env.MC_DIR || '/srv/mc';
  const { entries } = readServerProperties(mcDir);
  const map = toObject(entries);
  return (map['rcon.password'] || '').trim();
}

function resolveRconHost() {
  return (process.env.RCON_HOST || '127.0.0.1').trim();
}

function resolveRconPort() {
  const envPort = process.env.RCON_PORT;
  if (envPort) return Number(envPort);
  const mcDir = process.env.MC_DIR || '/srv/mc';
  const { entries } = readServerProperties(mcDir);
  const map = toObject(entries);
  return Number(map['rcon.port'] || 25575);
}

export async function getRcon() {
  const host = resolveRconHost();
  const port = resolveRconPort();
  const password = resolveRconPassword();

  if (!password) throw new Error('RCON password missing (set rcon.password in server.properties or RCON_PASSWORD env)');

  if (client) return client;

  client = await Rcon.connect({ host, port, password });
  client.on('end', () => { client = null; });
  client.on('error', () => { /* handled by callers */ });
  return client;
}

export async function sendCommand(cmd) {
  const rcon = await getRcon();
  return rcon.send(cmd);
}

export async function stopViaRcon() {
  return sendCommand('stop');
}

export async function endRcon() {
  try {
    if (client) client.end();
  } finally {
    client = null;
  }
}
