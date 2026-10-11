import express from "express";
import cors from "cors";

import "dotenv/config";

import fs from "fs";
import path from "path";

import { clerkMiddleware } from "@clerk/express";

import User from "./models/user.model.js";
import { connectDB } from "./lib/db.js";
import job from "./lib/cron.js";

import clerkWebhook from "./webhooks/clerk.webhook.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import deviceRoutes from "./routes/device.route.js";
import { app, server } from "./lib/socket.js";

const PORT = process.env.PORT || 3001;
const rawFrontend = process.env.FRONTEND_URL || "";
const normalizedFrontend = rawFrontend.replace(/\/+$/, "");

const candidatePublicDirs = [
  path.join(process.cwd(), "public"),
  path.join(process.cwd(), "services", "api", "public"),
  path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "public"),
  path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..", "apps", "web", "dist"),
];
const publicDir = candidatePublicDirs.find((dir) => fs.existsSync(dir)) || candidatePublicDirs[0];

// it's important that you don't parse the webhook event data, it should be in the raw format
app.use("/api/webhooks/clerk", express.raw({ type: "application/json" }), clerkWebhook);

// Security response headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

// Parse JSON with reasonable size limit to prevent memory exhaustion attacks
app.use(express.json({ limit: "1mb" }));

const allowedOrigins = new Set(
  [
    normalizedFrontend,
    rawFrontend,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:3001",
  ].filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, native webview)
      if (!origin) return callback(null, true);

      // Check explicit allowed origins list
      if (allowedOrigins.has(origin)) return callback(null, true);

      // In development or local testing, permit localhost and LAN testing
      if (
        process.env.NODE_ENV !== "production" &&
        (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
          /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
          /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin))
      ) {
        return callback(null, true);
      }

      // Check if origin matches trusted deployed domains
      try {
        const parsed = new URL(origin);
        if (
          parsed.hostname.endsWith(".onrender.com") ||
          parsed.hostname.endsWith(".vercel.app")
        ) {
          return callback(null, true);
        }
      } catch {
        return callback(null, false);
      }

      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(clerkMiddleware());

let lastMobileCrash = null;
app.post("/api/debug/crash", (req, res) => {
  lastMobileCrash = { ...req.body, receivedAt: new Date().toISOString() };
  console.error("🔥 [MOBILE CRASH REPORT RECEIVED] 🔥", JSON.stringify(lastMobileCrash, null, 2));
  res.status(200).json({ ok: true });
});
app.get("/api/debug/crash", (req, res) => {
  res.status(200).json({ ok: true, crash: lastMobileCrash });
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/device", deviceRoutes);

// if the public directory exists, serve the static files
// this is for the production build
if (fs.existsSync(publicDir)) {
  console.log(`Serving static files from: ${publicDir}`);
  app.use(
    express.static(publicDir, {
      setHeaders: (res, filePath) => {
        if (
          filePath.endsWith("index.html") ||
          filePath.endsWith("sw.js") ||
          filePath.endsWith("manifest.webmanifest")
        ) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else if (filePath.includes("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  app.get("/{*any}", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
  });
}

// Global error handler for upload errors, CORS rejections, and unhandled errors
app.use((err, req, res, next) => {
  if (err.name === "MulterError") {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err.message && err.message.includes("Only image, video, and audio")) {
    return res.status(400).json({ message: err.message });
  }
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ message: "Blocked by CORS policy" });
  }
  console.error("Unhandled API error:", err.message);
  res.status(err.status || 500).json({ message: "An unexpected error occurred" });
});

// Connect to DB first, then start listening so migrations run before requests arrive
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log("Server is up and running on PORT:", PORT);
    if (process.env.NODE_ENV === "production") job.start();
  });
}).catch((err) => {
  console.error("Failed to connect to DB, aborting startup:", err.message);
  process.exit(1);
});
