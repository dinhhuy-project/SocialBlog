import express, { type Request, Response, NextFunction } from "express";
//them
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startScheduler } from "./scheduler";
import { config } from 'dotenv';
import { configureSecurityHeaders } from "./security";
import { runAllTests } from '@/lib/xss-protection.test';


// Load environment variables from .env file
config();

const app = express();
app.use(express.json());
//them
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

// Configure security headers for XSS and other attacks protection
configureSecurityHeaders(app);

// Set correct MIME types
app.use((req, res, next) => {
  if (req.url.endsWith('.css')) {
    res.type('text/css');
  }
  next();
});

// Start the scheduler for scheduled post publishing/deletion
startScheduler();

// Helper function to get client IP address (handles proxies, load balancers)
function getClientIp(req: Request): string {
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

  // Fallback to req.ip or connection remote address
  return req.ip || (req.connection.remoteAddress as string) || "unknown";
}

// Middleware to log IP address on each request
app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp = getClientIp(req);
  (req as any).clientIp = clientIp; // Attach IP to request object for use in routes
  
  // Log all API requests with IP address
  if (req.path.startsWith("/api")) {
    const method = req.method;
    const path = req.path;
    console.log(`[IP LOG] ${method} ${path} - IP: ${clientIp}`);
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const clientIp = (req as any).clientIp || "unknown";
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms [IP: ${clientIp}]`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    console.log("Running in development mode with Vite");
    await setupVite(app, server);
  } else {
    console.log("Running in production mode, serving static files");
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: false,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

runAllTests();
