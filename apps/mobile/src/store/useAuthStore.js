import { create } from "zustand";
import { io } from "socket.io-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://imessage-fwxv.onrender.com";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  sessionToken: null,

  checkAuth: async (token) => {
    set({ isCheckingAuth: true, sessionToken: token });

    try {
      // Dynamic import to avoid circular reference with axios (which imports useAuthStore)
      const { axiosInstance } = await import("../lib/axios.js");
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.error("Error in checkAuth:", error?.response?.status, error?.message);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  clearAuth: () => {
    set({ authUser: null, isCheckingAuth: false, sessionToken: null, onlineUsers: [] });
    get().disconnectSocket();
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser || socket?.connected) return;

    const newSocket = io(API_URL, {
      query: { userId: authUser._id },
      transports: ["websocket"],
    });

    newSocket.connect();
    set({ socket: newSocket });

    newSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));
