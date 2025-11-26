import helmet from 'helmet';
import type { Express } from 'express';

/**
 * Configure security headers for XSS and other attacks protection
 */
export function configureSecurityHeaders(app: Express) {
  // Use helmet to set security headers
  app.use(helmet());

  // Additional Content Security Policy for XSS protection
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://static.cloudflareinsights.com",
          "https://challenges.cloudflare.com", // Turnstile CAPTCHA
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "https:",
          "ws:",
          "https://challenges.cloudflare.com", // Turnstile API calls
        ],
        frameSrc: [
          "'self'",
          "https://challenges.cloudflare.com", // Turnstile iframe
        ],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"], // Prevent <object>, <embed>, <applet>
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        blockAllMixedContent: [],
      },
    })
  );

  // Additional security headers
  app.use((req, res, next) => {
    // Prevent clickjacking attacks
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection in older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent opening in iframe from other origins
    res.setHeader('X-Frame-Options', 'DENY');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy (formerly Feature-Policy)
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    next();
  });

  console.log('✅ Security headers configured');
}

/**
 * Request validation middleware to prevent common attacks
 */
export function validateRequestBody(
  maxJsonSize: string = '1mb',
  maxUrlEncodedSize: string = '1mb'
) {
  return {
    json: { limit: maxJsonSize },
    urlencoded: { limit: maxUrlEncodedSize, extended: true },
  };
}

/**
 * Rate limiting configuration
 * Can be used to prevent brute force attacks
 */
export function getRateLimitConfig(
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) {
  return {
    windowMs,
    max: maxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  };
}

/**
 * CORS configuration
 * Restrict which origins can access the API
 */
export function getCorsConfig(
  allowedOrigins: string[] = ['http://localhost:5173', 'http://localhost:3000']
) {
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allowed?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

export default {
  configureSecurityHeaders,
  validateRequestBody,
  getRateLimitConfig,
  getCorsConfig,
};
