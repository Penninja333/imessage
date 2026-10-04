import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import { useChatStore } from "./useChatStore";
import { subscribeToWebPush } from "../lib/notifications";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    set({ isCheckingAuth: true });

    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });

      get().connectSocket(res.data);

      // Automatically register or update Web Push device token for this user
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        subscribeToWebPush().catch(() => {});
      }
    } catch (error) {
      console.error("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  clearAuth: () => {
    set({ authUser: null, isCheckingAuth: false, onlineUsers: [] });
    get().disconnectSocket();
  },

  connectSocket: (user) => {
    if (!user) return;
    const existingSocket = get().socket;
    if (existingSocket?.connected) return;

    const socket = io(BASE_URL, {
      query: { userId: user._id },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    set({ socket });

    socket.on("connect", () => {
      console.log("[socket] Connected to server ✓");
      useChatStore.getState().initSocketListeners(socket);
    });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("disconnect", (reason) => {
      console.log("[socket] Disconnected:", reason);
    });

    // Also call immediately in case connection was instantaneous
    if (socket.connected) {
      useChatStore.getState().initSocketListeners(socket);
    }
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      useChatStore.getState().cleanupSocketListeners();
      socket.disconnect();
    }
    set({ socket: null });
  },
}));
