// fbo-service/src/index.js

import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { prisma } from "./lib/prisma.js";
import fboRoutes from "./routes/fbo.js";

const DEFAULT_ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4000",
  "http://127.0.0.1:4000",
]);

function parseAllowedOrigins() {
  const raw = String(process.env.ALLOWED_ORIGINS || "").trim();
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function requireInternalToken(req, res, next) {
  const expected = String(process.env.FBO_SERVICE_INTERNAL_TOKEN || "").trim();
  const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";

  if (!expected) {
    if (isProd) {
      return res.status(503).json({ error: "Service interne non configuré" });
    }
    return next();
  }

  const provided = String(req.get("x-internal-token") || "").trim();
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

export function createApp() {
  const app = express();
  const allowedOrigins = parseAllowedOrigins();

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowedOrigins.has(origin)) return cb(null, true);
        return cb(new Error("CORS blocked"));
      },
      methods: ["GET"],
    }),
  );
  app.use(express.json({ limit: "16kb" }));

  app.get("/", (req, res) => {
    res.json({ status: "FBO service running" });
  });

  app.get("/health", async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", database: "ok" });
    } catch (error) {
      console.error("Healthcheck FBO failed:", error);
      res.status(503).json({ status: "error", database: "unavailable" });
    }
  });

  app.use("/fbo", requireInternalToken, fboRoutes);

  app.use((err, req, res, next) => {
    if (err?.message === "CORS blocked") {
      return res.status(403).json({ error: "Origin not allowed" });
    }
    return next(err);
  });

  return app;
}

export function startServer() {
  const app = createApp();
  const PORT = process.env.PORT || 3001;
  const server = app.listen(PORT, () => console.log("FBO service running on port", PORT));

  async function shutdown(signal) {
    console.log(`FBO service received ${signal}, shutting down`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
