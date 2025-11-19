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

// Helper function to get client IP address (handles proxies, load balancers)
export function getClientIp(req: Request): string {
  // Check X-Forwarded-For header (when behind proxy/load balancer)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = typeof forwardedFor === 'string' 
      ? forwardedFor.split(',')[0].trim() 
      : forwardedFor[0].trim();
    return ips;
  }

  // Check X-Real-IP header (alternative proxy header)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0];
  }

  // Check CF-Connecting-IP (Cloudflare)
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) {
    return typeof cfIp === 'string' ? cfIp : cfIp[0];
  }

  // Fallback to req.ip or connection remote address
  return req.ip || (req.connection.remoteAddress as string) || "unknown";
}