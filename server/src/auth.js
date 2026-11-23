import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'stampsbox-storefront-dev-secret-change-in-production';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, key] = stored.split(':');
  const hashBuffer = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  if (hashBuffer.length !== keyBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, keyBuffer);
}

export function signAdminToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}
