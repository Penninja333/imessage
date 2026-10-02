import { create } from "zustand";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create(
  persist(
    (set, get) => ({
      users: [],
      conversations: [],
      messages: [],
      selectedUser: null,
      isConversationsLoading: false,
      isUsersLoading: false,
      isMessagesLoading: false,
      activeConversationId: null,
      searchQuery: "",
      composerText: "",
      isSendingMedia: false,

      getUsers: async () => {
        set({ isUsersLoading: true });
        try {
          const res = await axiosInstance.get("/messages/users");
          set({ users: res.data });
        } catch (error) {
          console.log("Error in get Users", error.message);
        } finally {
          set({ isUsersLoading: false });
        }
      },

      getConversations: async () => {
        set({ isConversationsLoading: true });
        try {
          const res = await axiosInstance.get("/messages/conversations");
          set({ conversations: res.data });
        } catch (error) {
          console.log("Error in getConversations", error.message);
        } finally {
          set({ isConversationsLoading: false });
        }
      },

      getMessages: async (userId) => {
        if (!userId) return;
        set({ isMessagesLoading: true });
        try {
          const res = await axiosInstance.get(`/messages/${userId}`);
          set({ messages: res.data });
        } catch (error) {
          console.error("Failed to load messages", error);
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      sendMessage: async (messageData) => {
        const { activeConversationId, messages } = get();
        if (!activeConversationId) return false;

        try {
          const res = await axiosInstance.post(`/messages/send/${activeConversationId}`, messageData);
          set({ messages: [...messages, res.data], composerText: "" });
          get().getConversations();
          return true;
        } catch (error) {
          console.error("Failed to send message", error);
          return false;
        }
      },

      subscribeToMessages: (userId) => {
        if (!userId) return;

        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.off("newMessage");
        socket.on("newMessage", (newMessage) => {
          if (String(newMessage.senderId) !== String(userId)) return;
          set({ messages: [...get().messages, newMessage] });
          get().getConversations();
        });
      },

      unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket?.off("newMessage");
      },

      setActiveConversationId: (activeConversationId) => {
        set((state) => ({
          activeConversationId,
          messages: activeConversationId ? state.messages : [],
        }));
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setComposerText: (composerText) => set({ composerText }),

      setNickname: async (targetUserId, nickname) => {
        try {
          await axiosInstance.put(`/messages/nickname/${targetUserId}`, { nickname });
          get().getUsers();
          get().getConversations();
        } catch (error) {
          console.error("Failed to set nickname", error);
        }
      },

      sendTextMessage: async () => {
        const { activeConversationId, composerText } = get();
        const messageText = composerText.trim();
        if (!activeConversationId || !messageText) return false;

        return get().sendMessage({ text: messageText });
      },
    }),
    {
      name: "imessage-storage-mobile",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({}),
    }
  )
);
