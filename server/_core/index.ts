import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Security: HTTP headers via Helmet ─────────────────────────────────────
  // Sets X-Content-Type-Options, X-Frame-Options, HSTS, CSP, etc.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.resend.com", "https://hooks.zapier.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      // Allow cross-origin requests for the tRPC API from the same origin
      crossOriginResourcePolicy: { policy: "same-origin" },
    })
  );

  // ── Security: Rate limiting on the audit endpoint ─────────────────────────
  // Prevents abuse, scraping, and brute-force lead generation attacks.
  // Limit: 20 audit requests per IP per 15 minutes (generous for real users).
  const auditRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: "Too many audit requests from this IP. Please wait 15 minutes before trying again.",
    },
    skip: (req) => {
      // Skip rate limiting in development and for health checks
      return process.env.NODE_ENV === "development" || req.path === "/health";
    },
  });

  // Apply rate limit specifically to audit tRPC mutations
  app.use("/api/trpc/audit.run", auditRateLimit);
  app.use("/api/trpc/aiMentions.analyse", auditRateLimit);

  // ── Security: Body size limits ────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" })); // Reduced from 50mb — no file uploads needed on this route
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
