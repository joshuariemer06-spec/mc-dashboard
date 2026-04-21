import jwt from 'jsonwebtoken';
import { getDb } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid/expired token' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ error: 'Missing auth' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

export function getUserByUsername(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getUserCount() {
  return getDb().prepare('SELECT COUNT(*) as c FROM users').get().c;
}
