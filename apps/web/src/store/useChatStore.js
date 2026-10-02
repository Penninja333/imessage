import { create } from "zustand";
import { persist } from "zustand/middleware";

import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { showWebNotification } from "../lib/notifications";
import toast from "react-hot-toast";

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
      sidebarTab: "chats",
      composerText: "",
      isSoundEnabled: true,
      isSendingMedia: false,

      getUsers: async () => {
        set({ isUsersLoading: true });
        try {
          const res = await axiosInstance.get("/messages/users");
          set((state) => ({
            users: res.data,
            selectedUser:
              state.selectedUser && res.data.some((user) => user._id === state.selectedUser._id)
                ? state.selectedUser
                : null,
          }));
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
          toast.error(error.response?.data?.message || "Failed to load messages");
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        if (!selectedUser) return false;

        try {
          const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
          set({ messages: [...messages, res.data], composerText: "" });
          get().getConversations();
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to send message");
          return false;
        }
      },

      typingUser: null,

      subscribeToMessages: (userId) => {
        if (!userId) return;

        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.off("newMessage");
        socket.off("nicknameUpdated");
        socket.off("messageReaction");
        socket.off("messageDeleted");
        socket.off("userTyping");
        socket.off("userStopTyping");

        socket.on("newMessage", (newMessage) => {
          const isCurrentChat =
            String(newMessage.senderId) === String(userId) ||
            String(newMessage.receiverId) === String(userId);

          if (isCurrentChat) {
            set({ messages: [...get().messages, newMessage] });
          }

          if (String(newMessage.senderId) === String(userId) && !newMessage.isSystem) {
            const partner = get().selectedUser || get().users.find((u) => u._id === userId);
            const senderName = partner?.nickname || partner?.fullName || "iMessage";
            const body =
              newMessage.text ||
              (newMessage.image
                ? "📷 Photo"
                : newMessage.video
                  ? "🎥 Video"
                  : newMessage.audio
                    ? "🎤 Voice message"
                    : "New message");

            showWebNotification(senderName, {
              body,
              data: { conversationId: userId },
            });
          }

          get().getConversations();
        });

        socket.on("nicknameUpdated", (data) => {
          // data: { forUserId, withUserId, nickname, setByUserId, setByName, targetName, systemMessage }
          const authUser = useAuthStore.getState().authUser;
          const myId = String(authUser?._id);

          const applyNickname = (u) => {
            if (String(u._id) === String(data.forUserId) && String(data.withUserId) === myId) {
              return { ...u, nickname: data.nickname };
            }
            if (String(u._id) === String(data.withUserId) && String(data.forUserId) === myId) {
              return { ...u, myNickname: data.nickname };
            }
            return u;
          };

          set((state) => ({
            users: state.users.map(applyNickname),
            conversations: state.conversations.map(applyNickname),
            selectedUser: state.selectedUser ? applyNickname(state.selectedUser) : null,
          }));

          get().getConversations();
          get().getUsers();
        });

        socket.on("messageReaction", ({ messageId, reactions }) => {
          set((state) => ({
            messages: state.messages.map((m) =>
              m._id === messageId ? { ...m, reactions } : m
            ),
          }));
        });

        socket.on("messageDeleted", ({ messageId, text }) => {
          set((state) => ({
            messages: state.messages.map((m) =>
              m._id === messageId
                ? { ...m, text, deleted: true, image: null, video: null, audio: null }
                : m
            ),
          }));
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
        socket?.off("newMessage");
        socket?.off("nicknameUpdated");
        socket?.off("messageReaction");
        socket?.off("messageDeleted");
        socket?.off("userTyping");
        socket?.off("userStopTyping");
      },

      sendTyping: (receiverId) => {
        const socket = useAuthStore.getState().socket;
        socket?.emit("typing", { receiverId });
      },

      sendStopTyping: (receiverId) => {
        const socket = useAuthStore.getState().socket;
        socket?.emit("stopTyping", { receiverId });
      },

      setSelectedUser: (selectedUser) => set({ selectedUser }),

      setActiveConversationId: (activeConversationId) => {
        set((state) => ({
          activeConversationId,
          selectedUser:
            state.users.find((user) => user._id === activeConversationId) ||
            state.conversations.find((user) => user._id === activeConversationId) ||
            null,
          messages: activeConversationId ? state.messages : [],
        }));
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      setComposerText: (composerText) => set({ composerText }),
      setSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),

      setNickname: async (targetUserId, nickname) => {
        try {
          const res = await axiosInstance.put(`/messages/nickname/${targetUserId}`, { nickname });

          if (res.data?.systemMessage) {
            set((state) => ({
              messages: [...state.messages, res.data.systemMessage],
            }));
          }

          get().getUsers();
          get().getConversations();

          if (nickname) toast.success(`Nickname set: ${nickname}`);
          else toast.success("Nickname cleared");
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to set nickname");
        }
      },

      sendTextMessage: async (conversationId) => {
        const messageText = get().composerText.trim();
        if (!conversationId || !messageText) return false;

        return get().sendMessage({ text: messageText });
      },

      sendMediaMessage: async ({ conversationId, file }) => {
        if (!conversationId || !file) return false;

        const formData = new FormData();
        formData.append("media", file);

        set({ isSendingMedia: true });
        try {
          return await get().sendMessage(formData);
        } finally {
          set({ isSendingMedia: false });
        }
      },

      sendVoiceMessage: async ({ conversationId, audioBlob }) => {
        if (!conversationId || !audioBlob) return false;

        const mime = audioBlob.type || "audio/webm";
        const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";
        const file = new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: mime });

        const formData = new FormData();
        formData.append("media", file);

        set({ isSendingMedia: true });
        try {
          return await get().sendMessage(formData);
        } finally {
          set({ isSendingMedia: false });
        }
      },
    }),
    {
      name: "imessage-storage",
      partialize: (state) => ({ isSoundEnabled: state.isSoundEnabled }),
    },
  ),
);
