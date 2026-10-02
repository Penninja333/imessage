import { create } from "zustand";
import { persist } from "zustand/middleware";

import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { showWebNotification } from "../lib/notifications";
import toast from "react-hot-toast";

function updateAppBadge(totalCount) {
  if ("setAppBadge" in navigator) {
    if (totalCount > 0) {
      navigator.setAppBadge(totalCount).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }
}

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
      typingUser: null,

      syncBadge: () => {
        const total = get().conversations.reduce(
          (sum, c) => sum + (c.unreadCount || 0),
          0,
        );
        updateAppBadge(total);
      },

      getUsers: async () => {
        set({ isUsersLoading: true });
        try {
          const res = await axiosInstance.get("/messages/users");
          set((state) => ({
            users: res.data,
            selectedUser: state.selectedUser
              ? res.data.find((user) => String(user._id) === String(state.selectedUser._id)) || state.selectedUser
              : null,
          }));
        } catch (error) {
          console.log("Error in getUsers:", error.message);
        } finally {
          set({ isUsersLoading: false });
        }
      },

      getConversations: async () => {
        set({ isConversationsLoading: true });
        try {
          const res = await axiosInstance.get("/messages/conversations");
          set((state) => ({
            conversations: res.data,
            selectedUser: state.selectedUser
              ? res.data.find((user) => String(user._id) === String(state.selectedUser._id)) || state.selectedUser
              : null,
          }));
          get().syncBadge();
        } catch (error) {
          console.log("Error in getConversations:", error.message);
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

      markMessagesAsSeen: async (partnerId) => {
        if (!partnerId) return;

        // Clear unread count locally immediately
        set((state) => ({
          conversations: state.conversations.map((c) =>
            String(c._id) === String(partnerId) ? { ...c, unreadCount: 0 } : c,
          ),
        }));
        get().syncBadge();

        try {
          await axiosInstance.post(`/messages/${partnerId}/seen`);
          const socket = useAuthStore.getState().socket;
          if (socket?.connected) {
            socket.emit("markSeen", { senderId: partnerId });
          }
        } catch (error) {
          console.warn("Failed to mark messages as seen:", error.message);
        }
      },

      sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        if (!selectedUser) return false;

        try {
          const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
          set({
            messages: [...messages, res.data],
            composerText: "",
          });

          // Update conversations list with our newly sent message at top
          const previewText =
            res.data.text ||
            (res.data.image
              ? "📷 Photo"
              : res.data.video
                ? "🎥 Video"
                : res.data.audio
                  ? "🎤 Voice message"
                  : "New message");

          set((state) => {
            const partnerId = String(selectedUser._id);
            const existingIndex = state.conversations.findIndex(
              (c) => String(c._id) === partnerId,
            );

            if (existingIndex !== -1) {
              const existing = state.conversations[existingIndex];
              const updated = {
                ...existing,
                lastMessage: previewText,
                lastMessageAt: res.data.createdAt || new Date().toISOString(),
              };
              const rest = state.conversations.filter((_, idx) => idx !== existingIndex);
              return { conversations: [updated, ...rest] };
            } else {
              get().getConversations();
              return state;
            }
          });

          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to send message");
          return false;
        }
      },

      initSocketListeners: (socket) => {
        if (!socket) return;

        // Clean up previous listeners to prevent multiple registrations
        socket.off("newMessage");
        socket.off("messagesSeen");
        socket.off("nicknameUpdated");
        socket.off("messageReaction");
        socket.off("messageDeleted");
        socket.off("userTyping");
        socket.off("userStopTyping");

        socket.on("newMessage", (newMessage) => {
          const authUser = useAuthStore.getState().authUser;
          const myId = String(authUser?._id);
          const currentActiveId = get().activeConversationId;

          const isCurrentChat =
            (currentActiveId && String(newMessage.senderId) === String(currentActiveId)) ||
            (currentActiveId && String(newMessage.receiverId) === String(currentActiveId));

          // 1. If currently inside this chat, append to message list
          if (isCurrentChat) {
            set((state) => {
              if (state.messages.some((m) => m._id === newMessage._id)) return state;
              return { messages: [...state.messages, newMessage] };
            });

            // Mark seen if from the other user
            if (String(newMessage.senderId) === String(currentActiveId)) {
              get().markMessagesAsSeen(currentActiveId);
            }
          } else {
            // 2. Received while looking elsewhere / on another conversation
            if (String(newMessage.senderId) !== myId && !newMessage.isSystem) {
              if (get().isSoundEnabled) {
                const audio = new Audio("/sounds/keystroke1.mp3");
                audio.play().catch(() => {});
              }

              const partner =
                get().conversations.find((c) => String(c._id) === String(newMessage.senderId)) ||
                get().users.find((u) => String(u._id) === String(newMessage.senderId));
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
                data: { conversationId: newMessage.senderId },
              });
            }
          }

          // 3. Update conversations list & unread counters
          const partnerId =
            String(newMessage.senderId) === myId
              ? String(newMessage.receiverId)
              : String(newMessage.senderId);

          const previewText = newMessage.deleted
            ? "This message was deleted"
            : newMessage.text ||
              (newMessage.image
                ? "📷 Photo"
                : newMessage.video
                  ? "🎥 Video"
                  : newMessage.audio
                    ? "🎤 Voice message"
                    : "New message");

          set((state) => {
            const existingIndex = state.conversations.findIndex(
              (c) => String(c._id) === partnerId,
            );

            if (existingIndex !== -1) {
              const existing = state.conversations[existingIndex];
              const shouldIncrementUnread =
                String(newMessage.senderId) !== myId &&
                String(get().activeConversationId) !== partnerId;

              const updatedConv = {
                ...existing,
                lastMessage: previewText,
                lastMessageAt: newMessage.createdAt || new Date().toISOString(),
                unreadCount: shouldIncrementUnread
                  ? (existing.unreadCount || 0) + 1
                  : existing.unreadCount || 0,
              };

              const rest = state.conversations.filter((_, idx) => idx !== existingIndex);
              return { conversations: [updatedConv, ...rest] };
            } else {
              get().getConversations();
              return state;
            }
          });

          get().syncBadge();
        });

        socket.on("messagesSeen", ({ byUserId }) => {
          const activeId = get().activeConversationId;
          const authUser = useAuthStore.getState().authUser;
          const myId = String(authUser?._id);

          if (activeId && String(byUserId) === String(activeId)) {
            set((state) => ({
              messages: state.messages.map((m) =>
                String(m.senderId) === myId ? { ...m, seen: true } : m,
              ),
            }));
          }
        });

        socket.on("messageReaction", ({ messageId, reactions }) => {
          set((state) => ({
            messages: state.messages.map((m) =>
              m._id === messageId ? { ...m, reactions } : m,
            ),
          }));
        });

        socket.on("messageDeleted", ({ messageId, text }) => {
          set((state) => ({
            messages: state.messages.map((m) =>
              m._id === messageId
                ? { ...m, text, deleted: true, image: null, video: null, audio: null }
                : m,
            ),
          }));
        });

        socket.on("userTyping", ({ senderId }) => {
          const authUser = useAuthStore.getState().authUser;
          const activeId = get().activeConversationId;
          if (
            String(senderId) !== String(authUser?._id) &&
            String(senderId) === String(activeId)
          ) {
            set({ typingUser: senderId });
          }
        });

        socket.on("userStopTyping", ({ senderId }) => {
          if (String(senderId) === String(get().activeConversationId)) {
            set({ typingUser: null });
          }
        });

        socket.on("nicknameUpdated", (data) => {
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
      },

      cleanupSocketListeners: () => {
        const socket = useAuthStore.getState().socket;
        socket?.off("newMessage");
        socket?.off("messagesSeen");
        socket?.off("nicknameUpdated");
        socket?.off("messageReaction");
        socket?.off("messageDeleted");
        socket?.off("userTyping");
        socket?.off("userStopTyping");
      },

      // Kept for backward compatibility
      subscribeToMessages: () => {},
      unsubscribeFromMessages: () => {},

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
            state.users.find((user) => String(user._id) === String(activeConversationId)) ||
            state.conversations.find((user) => String(user._id) === String(activeConversationId)) ||
            null,
          messages: activeConversationId ? state.messages : [],
          typingUser: null,
        }));

        if (activeConversationId) {
          get().getMessages(activeConversationId);
          get().markMessagesAsSeen(activeConversationId);
        }
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      setComposerText: (composerText) => set({ composerText }),
      setSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),

      setNickname: async (targetUserId, nickname) => {
        if (!targetUserId || targetUserId === "undefined" || targetUserId === "null") {
          toast.error("Could not determine user to set nickname for");
          return;
        }

        const trimmed = (nickname || "").trim();
        const newNickname = trimmed || null;
        const targetIdStr = String(targetUserId);

        // Optimistically update local state immediately so UI updates with zero lag
        set((state) => {
          const updateObj = (u) =>
            String(u._id) === targetIdStr ? { ...u, nickname: newNickname } : u;

          return {
            users: state.users.map(updateObj),
            conversations: state.conversations.map(updateObj),
            selectedUser:
              state.selectedUser && String(state.selectedUser._id) === targetIdStr
                ? { ...state.selectedUser, nickname: newNickname }
                : state.selectedUser,
          };
        });

        try {
          const res = await axiosInstance.put(`/messages/nickname/${targetIdStr}`, {
            nickname: trimmed,
          });

          if (res.data?.systemMessage) {
            set((state) => ({
              messages: [...state.messages, res.data.systemMessage],
            }));
          }

          get().getUsers();
          get().getConversations();

          if (trimmed) toast.success(`Nickname set: ${trimmed}`);
          else toast.success("Nickname cleared");
        } catch (error) {
          console.error("setNickname error:", error);
          toast.error(error.response?.data?.message || "Failed to set nickname");
          get().getUsers();
          get().getConversations();
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

      toggleReaction: async (messageId, emoji) => {
        if (!messageId || !emoji) return false;
        try {
          const res = await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
          const updatedReactions = res.data?.reactions || [];
          set((state) => ({
            messages: state.messages.map((m) =>
              m._id === messageId ? { ...m, reactions: updatedReactions } : m,
            ),
          }));
          return true;
        } catch (error) {
          console.error("toggleReaction error:", error);
          toast.error("Could not add reaction");
          return false;
        }
      },

      deleteMessage: async (messageId) => {
        if (!messageId) return false;
        try {
          await axiosInstance.delete(`/messages/${messageId}`);
          set((state) => ({
            messages: state.messages.map((m) =>
              m._id === messageId
                ? {
                    ...m,
                    deleted: true,
                    text: "This message was deleted",
                    image: null,
                    video: null,
                    audio: null,
                  }
                : m,
            ),
          }));
          toast.success("Message deleted");
          return true;
        } catch (error) {
          console.error("deleteMessage error:", error);
          toast.error(error.response?.data?.message || "Could not delete message");
          return false;
        }
      },
    }),
    {
      name: "imessage-storage",
      partialize: (state) => ({ isSoundEnabled: state.isSoundEnabled }),
    },
  ),
);
