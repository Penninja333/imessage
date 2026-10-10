import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { checkAuth, MongoUser } from "../api/auth";
import Constants from "expo-constants";
import { Platform } from "react-native";

const defaultHost = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";
const socketBaseURL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/api$/, "") ||
  Constants.expoConfig?.extra?.apiUrl?.replace(/\/api$/, "") ||
  defaultHost;

interface AuthState {
  authUser: MongoUser | null;
  isCheckingAuth: boolean;
  onlineUsers: string[];
  socket: Socket | null;
  syncAuthUser: () => Promise<MongoUser | null>;
  clearAuth: () => void;
  connectSocket: (user: MongoUser) => void;
  disconnectSocket: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  authUser: null,
  isCheckingAuth: false,
  onlineUsers: [],
  socket: null,

  syncAuthUser: async () => {
    set({ isCheckingAuth: true });
    try {
      const user = await checkAuth();
      set({ authUser: user, isCheckingAuth: false });
      get().connectSocket(user);
      return user;
    } catch (err) {
      console.warn("syncAuthUser error:", err);
      set({ authUser: null, isCheckingAuth: false });
      return null;
    }
  },

  clearAuth: () => {
    get().disconnectSocket();
    set({ authUser: null, isCheckingAuth: false, onlineUsers: [] });
  },

  connectSocket: (user: MongoUser) => {
    if (!user?._id) return;
    const currentSocket = get().socket;
    if (currentSocket?.connected) return;

    if (currentSocket) {
      currentSocket.disconnect();
    }

    const socket = io(socketBaseURL, {
      query: { userId: user._id },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected to server, id:", socket.id);
    });

    socket.on("getOnlineUsers", (users: string[]) => {
      set({ onlineUsers: users || [] });
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const s = get().socket;
    if (s) {
      s.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));
