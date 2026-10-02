import { create } from 'zustand';
import { io } from 'socket.io-client';
import { axiosInstance, setAuthToken } from '../lib/axios';

const SOCKET_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3000';

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async (token) => {
    try {
      setAuthToken(token);
      const res = await axiosInstance.get('/auth/check');
      set({ authUser: res.data, isCheckingAuth: false });
      get().connectSocket(token);
      return res.data;
    } catch (error) {
      console.warn('Check auth error:', error?.response?.data || error.message);
      set({ authUser: null, isCheckingAuth: false });
      get().disconnectSocket();
      return null;
    }
  },

  clearAuth: () => {
    setAuthToken(null);
    get().disconnectSocket();
    set({ authUser: null, isCheckingAuth: false, onlineUsers: [] });
  },

  connectSocket: (token) => {
    const { authUser, socket } = get();
    if (!authUser) return;
    if (socket?.connected) return;

    if (socket) {
      socket.disconnect();
    }

    const socketUrl = SOCKET_URL.replace(/\/api\/?$/, '');
    const newSocket = io(socketUrl, {
      auth: { token: token ? `Bearer ${token}` : undefined },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('getOnlineUsers', (userIds) => {
      set({ onlineUsers: userIds });
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));
