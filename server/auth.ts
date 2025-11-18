import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import type { SelectUser } from '@shared/schema';
import { config } from 'dotenv';
import { nanoid } from 'nanoid';

config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
if (!process.env.REFRESH_SECRET) {
  throw new Error('REFRESH_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const SALT_ROUNDS = 10;

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    roleId: number;
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(user: { id: number; username: string; email: string; roleId: number }): string {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, roleId: user.roleId },
    JWT_SECRET,
    { expiresIn: '7d' } // tăng từ 1m lên 7d
  );
}


export function generateRefreshToken(user: { id: number }): string {
  return jwt.sign(
    { id: user.id },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAccessToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): any {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const accessToken = req.cookies.accessToken;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const decoded = verifyAccessToken(accessToken);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = {
    id: decoded.id,
    username: decoded.username,
    email: decoded.email,
    roleId: decoded.roleId
  };
  next();
}

export async function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const accessToken = req.cookies.accessToken;
  
  if (accessToken) {
    const decoded = verifyAccessToken(accessToken);
    if (decoded) {
      req.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        roleId: decoded.roleId
      };
    }
  }

  next();
}

export function requireRole(...allowedRoles: number[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.roleId)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// ✅ HELPERS
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateUniqueToken(): string {
  return nanoid(64);
}

export function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  return ip;
}

export async function isHighRiskLogin(
  lastLoginIp: string | null,
  lastLoginAt: Date | null,
  currentIp: string
): Promise<boolean> {
  if (!lastLoginAt) return true;
  if (lastLoginIp !== currentIp) return true;
  
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (lastLoginAt.getTime() < thirtyDaysAgo) return true;
  
  return false;
}
// export function isHighRiskLogin(
//   lastLoginIp: string | null,
//   lastLoginAt: Date | null,
//   currentIp: string
// ): boolean {
//   // 1. Chưa từng login lần nào → high risk
//   if (!lastLoginAt || !lastLoginIp || lastLoginIp === '127.0.0.1' || lastLoginIp === '::1' || lastLoginIp.trim() === '') {
//     return true;
//   }

//   // 2. IP khác hoàn toàn → high risk
//   if (lastLoginIp !== currentIp) {
//     return true;
//   }

//   // 3. Lâu quá 30 ngày không login → high risk
//   const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
//   if (new Date(lastLoginAt).getTime() < thirtyDaysAgo) {
//     return true;
//   }

//   return false;
// }
// lấy dĩa chi ip
// export function getRealClientIp(req: Request): string {
//   // 1. Cloudflare – ưu tiên cao nhất
//   const cfIp = req.headers['cf-connecting-ip'];
//   if (cfIp) {
//     return Array.isArray(cfIp) ? cfIp[0].trim() : cfIp.trim();
//   }

//   // 2. Các header khác (Nginx, Vercel, Render, Railway, Fly.io, v.v.)
//   const forwarded = req.headers['x-forwarded-for'];
//   if (forwarded) {
//     const ip = Array.isArray(forwarded) 
//       ? forwarded[0] 
//       : forwarded.split(',')[0];
//     return ip.trim();
//   }

//   // 3. X-Real-IP (Nginx thường dùng)
//   const realIp = req.headers['x-real-ip'];
//   if (realIp) {
//     return Array.isArray(realIp) ? realIp[0].trim() : realIp.trim();
//   }

//   // 4. Cuối cùng mới đến req.ip (phải bật trust proxy)
//   return req.ip || req.socket.remoteAddress || 'unknown';
// }
export function getRealClientIp(req: Request): string {
  // 1. Cloudflare (production)
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) {
    return Array.isArray(cfIp) ? cfIp[0].trim() : cfIp.trim();
  }

  // 2. Các proxy khác (ngrok, Vercel, Render, Railway...)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) 
      ? forwarded[0] 
      : forwarded.split(',')[0];
    return ip.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0].trim() : realIp.trim();
  }

  // 3. Fallback cho localhost dev – lấy IP từ kết nối socket (rất chính xác)
  const socketIp = req.socket.remoteAddress;
  if (socketIp) {
    // Xử lý IPv6 localhost ::1 → chuyển thành 127.0.0.1 cho đẹp
    if (socketIp === '::1' || socketIp === '::ffff:127.0.0.1') return '127.0.0.1';
    if (socketIp.startsWith('::ffff:')) return socketIp.replace('::ffff:', '');
    return socketIp;
  }

  return req.ip || 'unknown';
}