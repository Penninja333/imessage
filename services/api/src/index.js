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

const publicDir = path.join(process.cwd(), "public");

// it's important that you don't parse the webhook event data, it should be in the raw format
app.use("/api/webhooks/clerk", express.raw({ type: "application/json" }), clerkWebhook);

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin === normalizedFrontend ||
        origin === rawFrontend ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("onrender.com") ||
        origin.includes("vercel.app")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(clerkMiddleware());

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/devices", deviceRoutes);

// if the public directory exists, serve the static files
// this is for the production build
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.get("/{*any}", (req, res, next) => {
    res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
  });
}

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
