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
      typingUser: null,

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

        // Clear all listeners first to avoid duplicates
        socket.off("newMessage");
        socket.off("nicknameUpdated");
        socket.off("messageReaction");
        socket.off("messageDeleted");
        socket.off("userTyping");
        socket.off("userStopTyping");

        socket.on("newMessage", (newMessage) => {
          const { messages } = get();
          // Accept messages from peer, or system messages relevant to this chat
          const isRelevant =
            String(newMessage.senderId) === String(userId) ||
            String(newMessage.receiverId) === String(userId) ||
            newMessage.isSystem;
          if (!isRelevant) return;
          set({ messages: [...messages, newMessage] });
          get().getConversations();
        });

        socket.on("nicknameUpdated", () => {
          get().getUsers();
          get().getConversations();
        });

        socket.on("messageReaction", ({ messageId, reactions }) => {
          set({
            messages: get().messages.map((m) =>
              String(m._id) === String(messageId) ? { ...m, reactions } : m
            ),
          });
        });

        socket.on("messageDeleted", ({ messageId }) => {
          set({
            messages: get().messages.map((m) =>
              String(m._id) === String(messageId)
                ? { ...m, deleted: true, text: null, image: null }
                : m
            ),
          });
        });

        socket.on("userTyping", ({ senderId }) => {
          if (String(senderId) === String(userId)) {
            set({ typingUser: senderId });
          }
        });

        socket.on("userStopTyping", ({ senderId }) => {
          if (String(senderId) === String(userId)) {
            set({ typingUser: null });
          }
        });
      },

      unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        socket.off("newMessage");
        socket.off("nicknameUpdated");
        socket.off("messageReaction");
        socket.off("messageDeleted");
        socket.off("userTyping");
        socket.off("userStopTyping");
      },

      setActiveConversationId: (activeConversationId) => {
        set((state) => ({
          activeConversationId,
          messages: activeConversationId ? state.messages : [],
          typingUser: null,
        }));
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setComposerText: (composerText) => set({ composerText }),

      setNickname: async (targetUserId, nickname) => {
        try {
          const res = await axiosInstance.put(`/messages/nickname/${targetUserId}`, { nickname });
          // Append system message if the server returned one
          if (res.data?.systemMessage) {
            set({ messages: [...get().messages, res.data.systemMessage] });
          }
          get().getUsers();
          get().getConversations();
        } catch (error) {
          console.error("Failed to set nickname", error);
        }
      },

      toggleReaction: async (messageId, emoji) => {
        try {
          await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
        } catch (error) {
          console.error("Failed to toggle reaction", error);
        }
      },

      deleteMessage: async (messageId) => {
        try {
          await axiosInstance.delete(`/messages/${messageId}`);
        } catch (error) {
          console.error("Failed to delete message", error);
        }
      },

      sendTyping: (receiverId) => {
        const socket = useAuthStore.getState().socket;
        socket?.emit("typing", { receiverId });
      },

      sendStopTyping: (receiverId) => {
        const socket = useAuthStore.getState().socket;
        socket?.emit("stopTyping", { receiverId });
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
