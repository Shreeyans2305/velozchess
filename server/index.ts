import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import cors from "cors";
import { createServer } from "http";
import dns from "dns";

// Force IPv4 ordering to prevent ENETUNREACH errors on Render with Supabase
dns.setDefaultResultOrder("ipv4first");

// CRITICAL FIX: Monkey-patch dns.lookup to strictly force IPv4.
// This is necessary because some environments ignore setDefaultResultOrder.
const originalLookup = dns.lookup;
// @ts-ignore
dns.lookup = (hostname: string, options: any, callback: any) => {
  let opts = options;
  let cb = callback;

  if (typeof options === "function") {
    cb = options;
    opts = {};
  } else if (typeof options === "number") {
    // If options is a number (family), ignore it and use 4
    opts = { family: 4 };
  } else if (!opts) {
    opts = {};
  }

  // Force IP family 4
  opts.family = 4;
  opts.hints = (opts.hints || 0) | dns.ADDRCONFIG | dns.V4MAPPED;

  return originalLookup(hostname, opts, cb);
};

const app = express();
const httpServer = createServer(app);

// Configure CORS
const allowedOrigin = process.env.VITE_FRONTEND_URL ? process.env.VITE_FRONTEND_URL.replace(/\/$/, "") : "*";
app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  if (process.env.NODE_ENV === "production") {
    // Only serve static files if NOT explicitly disabled
    if (process.env.DISABLE_STATIC_SERVING !== "true") {
      try {
        serveStatic(app);
      } catch (e) {
        console.warn("Static file serving skipped:", e);
      }
    }
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
