// fbo-service/src/index.js

import crypto from "node:crypto";
import express from "express";
import cors from "cors";
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
app.use(express.json());

app.use("/fbo", requireInternalToken, fboRoutes);

app.get("/", (req, res) => {
  res.json({ status: "FBO service running" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("FBO service running on port", PORT));
