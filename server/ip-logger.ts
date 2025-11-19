/**
 * IP Logger Utility
 * Provides helpers to log and track user IP addresses and login activity
 */

import { Request } from 'express';

export interface IpLogEntry {
  timestamp: string;
  userId?: number;
  username?: string;
  email?: string;
  action: string; // login, register, 2fa, etc.
  ip: string;
  maskedIp: string;
  userAgent?: string;
  status: 'success' | 'failed' | 'pending';
  details?: string;
}

// In-memory log storage (for development)
// In production, you should log this to a database or external service
const ipLogs: IpLogEntry[] = [];

/**
 * Get client IP address from request
 * Handles proxies, load balancers, and Cloudflare
 */
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

/**
 * Mask IP address for privacy
 * Example: 192.168.1.100 -> 192.168.*.*
 */
export function maskIp(ip: string): string {
  if (ip === "unknown") return "unknown";
  
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  
  // IPv6
  if (ip.includes(':')) {
    const ipParts = ip.split(':');
    return ipParts.slice(0, 2).join(':') + ':*:*';
  }
  
  return ip;
}

/**
 * Log an IP access event
 */
export function logIpAccess(entry: IpLogEntry): void {
  const logEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  
  ipLogs.push(logEntry);
  
  // Also log to console for development
  const logMessage = `[${logEntry.action.toUpperCase()}] ${logEntry.email || logEntry.username || 'Unknown'} - IP: ${logEntry.ip} (${logEntry.maskedIp}) - Status: ${logEntry.status}`;
  
  if (logEntry.status === 'failed') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
  
  if (logEntry.details) {
    console.log(`  └─ Details: ${logEntry.details}`);
  }
}

/**
 * Get IP logs for a specific user
 */
export function getUserIpLogs(userId: number): IpLogEntry[] {
  return ipLogs.filter(log => log.userId === userId);
}

/**
 * Get IP logs for a specific IP address
 */
export function getIpLogs(ip: string): IpLogEntry[] {
  return ipLogs.filter(log => log.ip === ip);
}

/**
 * Get recent IP logs
 */
export function getRecentIpLogs(limit: number = 50): IpLogEntry[] {
  return ipLogs.slice(-limit).reverse();
}

/**
 * Check if IP is suspicious based on access patterns
 */
export function isSuspiciousIp(ip: string, riskThreshold: number = 3): boolean {
  const failedAttempts = ipLogs.filter(
    log => log.ip === ip && log.status === 'failed'
  ).length;
  
  return failedAttempts >= riskThreshold;
}

/**
 * Get all IPs for a user with timestamps
 */
export function getUserIpHistory(userId: number): Array<{ip: string; maskedIp: string; timestamp: string; action: string}> {
  return getUserIpLogs(userId).map(log => ({
    ip: log.ip,
    maskedIp: log.maskedIp,
    timestamp: log.timestamp,
    action: log.action,
  }));
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: Request): string {
  return (req.headers['user-agent'] || 'unknown').toString();
}

/**
 * Get browser and OS info from user agent
 */
export function parseBrowserInfo(userAgent: string): { browser: string; os: string } {
  let browser = 'Unknown';
  let os = 'Unknown';
  
  // Browser detection
  if (/Chrome/.test(userAgent)) browser = 'Chrome';
  else if (/Firefox/.test(userAgent)) browser = 'Firefox';
  else if (/Safari/.test(userAgent)) browser = 'Safari';
  else if (/Edge/.test(userAgent)) browser = 'Edge';
  
  // OS detection
  if (/Windows/.test(userAgent)) os = 'Windows';
  else if (/Mac/.test(userAgent)) os = 'macOS';
  else if (/Linux/.test(userAgent)) os = 'Linux';
  else if (/iPhone|iPad|iPod/.test(userAgent)) os = 'iOS';
  else if (/Android/.test(userAgent)) os = 'Android';
  
  return { browser, os };
}

/**
 * Clear logs (use with caution)
 */
export function clearLogs(): void {
  ipLogs.length = 0;
  console.log('[IP-LOGGER] All logs cleared');
}

/**
 * Export logs as JSON
 */
export function exportLogs(): string {
  return JSON.stringify(ipLogs, null, 2);
}

/**
 * Get statistics
 */
export function getLogStatistics() {
  const stats = {
    totalLogs: ipLogs.length,
    uniqueIps: new Set(ipLogs.map(log => log.ip)).size,
    uniqueUsers: new Set(ipLogs.map(log => log.userId)).size,
    successfulLogins: ipLogs.filter(log => log.action === 'login' && log.status === 'success').length,
    failedLogins: ipLogs.filter(log => log.action === 'login' && log.status === 'failed').length,
    registrations: ipLogs.filter(log => log.action === 'register').length,
  };
  
  return stats;
}
