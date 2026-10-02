import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) or any web origin
      callback(null, true);
    },
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 15000,
});

// Map of userId -> Set of socket IDs (to support multiple tabs/devices per user)
const userSocketMap = new Map();

function isUserOnline(userId) {
  const sockets = userSocketMap.get(String(userId));
  return Boolean(sockets && sockets.size > 0);
}

function getReceiverSocketId(userId) {
  // Returns the room name (userId) if online, so io.to(userId) sends to all user's devices
  if (isUserOnline(userId)) {
    return String(userId);
  }
  return null;
}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    const idStr = String(userId);
    if (!userSocketMap.has(idStr)) {
      userSocketMap.set(idStr, new Set());
    }
    userSocketMap.get(idStr).add(socket.id);

    // Join room for this user so io.to(userId) reaches all their active devices
    socket.join(idStr);

    // Broadcast list of currently online user IDs
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
  }

  // Typing indicators
  socket.on("typing", ({ receiverId }) => {
    if (receiverId) {
      io.to(String(receiverId)).emit("userTyping", { senderId: userId });
    }
  });

  socket.on("stopTyping", ({ receiverId }) => {
    if (receiverId) {
      io.to(String(receiverId)).emit("userStopTyping", { senderId: userId });
    }
  });

  // Mark messages as seen in real-time
  socket.on("markSeen", ({ senderId }) => {
    if (senderId) {
      io.to(String(senderId)).emit("messagesSeen", { byUserId: userId });
    }
  });

  socket.on("disconnect", () => {
    if (userId) {
      const idStr = String(userId);
      const sockets = userSocketMap.get(idStr);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSocketMap.delete(idStr);
        }
      }
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    }
  });
});

export { app, server, io, getReceiverSocketId, isUserOnline };
