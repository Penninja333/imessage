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
      isLoadingMoreMessages: false,
      hasMoreMessages: false,
      activeConversationId: null,
      searchQuery: "",
      sidebarTab: "chats",
      composerText: "",
      isSoundEnabled: true,
      isSendingMedia: false,
      typingUser: null,
      replyingTo: null, // { id, text, imageUrl, videoUrl, audioUrl, senderName, isOwnMessage }
      editingMessage: null, // { id, text }
      isInChatSearchOpen: false,
      inChatSearchQuery: "",
      activeMatchId: null,
      conversationThemes: {}, // { [partnerId]: themeId } — shared per-conversation, synced via socket
      drafts: {}, // { [conversationId]: string } — persisted per-conversation draft text
      // Global search
      globalSearchResults: [],
      isGlobalSearching: false,
      isGlobalSearchOpen: false,
      // Forward message
      forwardingMessage: null, // { id, text, imageUrl, ... } — set when user picks "Forward"
      // Pinned messages for active conversation
      pinnedMessages: [],
      // Link preview cache: { [url]: { title, description, image, siteName, url } | null }
      linkPreviews: {},

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
        set({ isMessagesLoading: true, hasMoreMessages: false });
        get().getPinnedMessages(userId);
        try {
          const res = await axiosInstance.get(`/messages/${userId}?limit=50`);
          // API now returns { messages, hasMore }
          const { messages, hasMore } = res.data;
          set({ messages: messages || [], hasMoreMessages: Boolean(hasMore) });
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to load messages");
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      loadMoreMessages: async (userId) => {
        if (!userId || get().isLoadingMoreMessages || !get().hasMoreMessages) return;
        const firstMessage = get().messages[0];
        if (!firstMessage) return;
        set({ isLoadingMoreMessages: true });
        try {
          const before = firstMessage.createdAt;
          const res = await axiosInstance.get(`/messages/${userId}?limit=50&before=${encodeURIComponent(before)}`);
          const { messages: older, hasMore } = res.data;
          set((state) => ({
            messages: [...(older || []), ...state.messages],
            hasMoreMessages: Boolean(hasMore),
          }));
        } catch (error) {
          console.warn("loadMoreMessages error:", error.message);
        } finally {
          set({ isLoadingMoreMessages: false });
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
        const selectedUser = get().selectedUser;
        if (!selectedUser) return false;

        try {
          const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
          const sentMessage = res.data;

          // Functional update: never overwrite concurrent messages from socket or other requests
          set((state) => {
            const alreadyExists = state.messages.some(
              (m) => String(m._id) === String(sentMessage._id),
            );
            if (alreadyExists) return state;
            return {
              messages: [...state.messages, sentMessage],
            };
          });

          // Update conversations list with our newly sent message at top
          const previewText =
            sentMessage.text ||
            (sentMessage.image
              ? "📷 Photo"
              : sentMessage.video
                ? "🎥 Video"
                : sentMessage.audio
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
                lastMessageAt: sentMessage.createdAt || new Date().toISOString(),
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
        socket.off("messageEdited");
        socket.off("emojiBurst");
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

              // Privacy rule: Only show sender name and notification count notice
              showWebNotification(senderName, {
                body: "1 new notification • Open application to view",
                tag: `chat-${newMessage.senderId}`,
                renotify: true,
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
              String(m._id) === String(messageId) ? { ...m, reactions } : m,
            ),
          }));
        });

        socket.on("messageDeleted", ({ messageId, text }) => {
          set((state) => ({
            messages: state.messages.map((m) =>
              String(m._id) === String(messageId)
                ? { ...m, text, deleted: true, image: null, video: null, audio: null }
                : m,
            ),
          }));
        });

        socket.on("messageEdited", ({ messageId, text, editedAt }) => {
          set((state) => ({
            messages: state.messages.map((m) =>
              String(m._id) === String(messageId)
                ? { ...m, text, isEdited: true, editedAt }
                : m,
            ),
          }));
        });

        socket.on("emojiBurst", ({ senderId, emoji, x, y }) => {
          const activeId = get().activeConversationId;
          if (activeId && String(senderId) === String(activeId)) {
            if (typeof window !== "undefined" && window.__triggerEmojiBurst) {
              window.__triggerEmojiBurst({
                emoji,
                x: typeof x === "number" && x <= 1 ? x * window.innerWidth : x,
                y: typeof y === "number" && y <= 1 ? y * window.innerHeight : y,
                isRemote: true,
              });
            }
          }
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

        // ── Shared conversation theme — synced to both participants ──────────
        socket.off("chatThemeChanged");
        socket.on("chatThemeChanged", ({ partnerId, themeId }) => {
          if (!partnerId || !themeId) return;
          set((state) => ({
            conversationThemes: {
              ...state.conversationThemes,
              [String(partnerId)]: themeId,
            },
          }));
        });

        // ── Pinned messages sync across participants ─────────────────────────
        socket.off("messagePinUpdated");
        socket.on("messagePinUpdated", ({ messageId, pinned, pinnedAt, pinnedBy, conversationPartnerId }) => {
          set((state) => ({
            messages: state.messages.map((m) =>
              String(m._id) === String(messageId)
                ? { ...m, pinned, pinnedAt, pinnedBy }
                : m,
            ),
          }));
          const activeId = get().activeConversationId;
          if (
            activeId &&
            (String(conversationPartnerId) === String(activeId) ||
              get().messages.some((m) => String(m._id) === String(messageId)))
          ) {
            get().getPinnedMessages(activeId);
          }
        });
      },

      cleanupSocketListeners: () => {
        const socket = useAuthStore.getState().socket;
        socket?.off("newMessage");
        socket?.off("messagesSeen");
        socket?.off("nicknameUpdated");
        socket?.off("messageReaction");
        socket?.off("messageDeleted");
        socket?.off("messageEdited");
        socket?.off("emojiBurst");
        socket?.off("userTyping");
        socket?.off("userStopTyping");
        socket?.off("chatThemeChanged");
        socket?.off("messagePinUpdated");
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
        // Save current composerText as draft for the outgoing conversation
        const prevConvId = get().activeConversationId;
        const currentText = get().composerText;
        if (prevConvId) {
          get().setDraft(prevConvId, currentText);
        }

        // Restore draft for the incoming conversation
        const restoredDraft = activeConversationId ? (get().drafts[String(activeConversationId)] || "") : "";

        set((state) => ({
          activeConversationId,
          composerText: restoredDraft,
          selectedUser:
            state.users.find((user) => String(user._id) === String(activeConversationId)) ||
            state.conversations.find((user) => String(user._id) === String(activeConversationId)) ||
            null,
          messages: [], // always clear immediately — never show stale messages from previous convo
          hasMoreMessages: false,
          isLoadingMoreMessages: false,
          typingUser: null,
          replyingTo: null,
          editingMessage: null,
          isInChatSearchOpen: false,
          inChatSearchQuery: "",
          activeMatchId: null,
        }));

        if (activeConversationId) {
          get().getMessages(activeConversationId);
          get().getConversationTheme(activeConversationId);
          get().markMessagesAsSeen(activeConversationId);

          if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: "CLEAR_NOTIFICATIONS",
              senderId: activeConversationId,
            });
          }
        }
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      setComposerText: (composerText) => set({ composerText }),
      setSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),
      setReplyingTo: (message) => set({ replyingTo: message }),
      clearReplyingTo: () => set({ replyingTo: null }),

      // ── Shared conversation theme ────────────────────────────────────────
      getConversationTheme: async (partnerId) => {
        if (!partnerId || partnerId === "undefined" || partnerId === "null") return;
        try {
          const res = await axiosInstance.get(`/messages/${partnerId}/theme`);
          const themeId = res.data?.themeId ?? "default";
          set((state) => ({
            conversationThemes: {
              ...state.conversationThemes,
              [String(partnerId)]: themeId,
            },
          }));
        } catch {
          // silently fall back to default — non-critical
        }
      },

      setConversationTheme: async (partnerId, themeId) => {
        if (!partnerId) return;
        // Optimistic update so our own UI changes instantly
        set((state) => ({
          conversationThemes: {
            ...state.conversationThemes,
            [String(partnerId)]: themeId,
          },
        }));
        try {
          const res = await axiosInstance.put(`/messages/${partnerId}/theme`, { themeId });
          // Append the system message to the current chat if we're in it
          if (res.data?.systemMessage) {
            const activeId = get().activeConversationId;
            if (String(activeId) === String(partnerId)) {
              set((state) => {
                if (state.messages.some((m) => m._id === res.data.systemMessage._id)) return state;
                return { messages: [...state.messages, res.data.systemMessage] };
              });
            }
          }
        } catch {
          toast.error("Could not change theme");
          // Revert optimistic update
          get().getConversationTheme(partnerId);
        }
      },

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

        const replyingTo = get().replyingTo;

        // Clear composer, reply state, and persisted draft immediately
        set({ composerText: "", replyingTo: null });
        get().clearDraft(conversationId);

        const payload = { text: messageText };
        if (replyingTo?.id) payload.replyToId = replyingTo.id;

        const success = await get().sendMessage(payload);
        if (!success) {
          // If sending failed, restore text if composer is still empty
          set((state) => ({
            composerText: state.composerText ? state.composerText : messageText,
            replyingTo: state.replyingTo || replyingTo,
          }));
        }
        return success;
      },

      sendMediaMessage: async ({ conversationId, file, caption }) => {
        if (!conversationId || !file) return false;

        const formData = new FormData();
        formData.append("media", file);
        if (caption && caption.trim()) {
          formData.append("text", caption.trim());
        }
        const replyingTo = get().replyingTo;
        if (replyingTo?.id) {
          formData.append("replyToId", replyingTo.id);
        }

        set({ isSendingMedia: true });
        try {
          const success = await get().sendMessage(formData);
          if (success && replyingTo) {
            set({ replyingTo: null });
          }
          return success;
        } finally {
          set({ isSendingMedia: false });
        }
      },

      sendVoiceMessage: async ({ conversationId, audioBlob }) => {
        if (!conversationId || !audioBlob) return false;

        const mime = audioBlob.type || "audio/mp4";
        const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
        const file = new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: mime });

        const formData = new FormData();
        formData.append("media", file);
        const replyingTo = get().replyingTo;
        if (replyingTo?.id) {
          formData.append("replyToId", replyingTo.id);
        }

        set({ isSendingMedia: true });
        try {
          const success = await get().sendMessage(formData);
          if (success && replyingTo) {
            set({ replyingTo: null });
          }
          return success;
        } finally {
          set({ isSendingMedia: false });
        }
      },

      toggleReaction: async (messageId, emoji) => {
        if (!messageId || !emoji) return false;

        const authUser = useAuthStore.getState().authUser;
        const myId = authUser?._id ? String(authUser._id) : "";

        // Snapshot for rollback in case of network or server error
        const previousMessages = get().messages;

        // Optimistic update for zero-latency instant feedback
        if (myId) {
          set((state) => ({
            messages: state.messages.map((m) => {
              if (String(m._id) !== String(messageId)) return m;

              const existingReactions = Array.isArray(m.reactions) ? [...m.reactions] : [];
              const myReactionIndex = existingReactions.findIndex(
                (r) => String(r.userId) === myId,
              );

              if (myReactionIndex > -1) {
                if (existingReactions[myReactionIndex].emoji === emoji) {
                  // Toggle off
                  existingReactions.splice(myReactionIndex, 1);
                } else {
                  // Switch emoji
                  existingReactions[myReactionIndex] = {
                    ...existingReactions[myReactionIndex],
                    emoji,
                  };
                }
              } else {
                // Add new reaction
                existingReactions.push({ userId: myId, emoji });
              }

              return { ...m, reactions: existingReactions };
            }),
          }));
        }

        try {
          const res = await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
          const updatedReactions = res.data?.reactions || [];
          set((state) => ({
            messages: state.messages.map((m) =>
              String(m._id) === String(messageId) ? { ...m, reactions: updatedReactions } : m,
            ),
          }));
          return true;
        } catch (error) {
          console.error("toggleReaction error:", error);
          // Rollback optimistic update
          set({ messages: previousMessages });
          toast.error("Could not update reaction");
          return false;
        }
      },

      deleteMessage: async (messageId) => {
        if (!messageId) return false;
        try {
          await axiosInstance.delete(`/messages/${messageId}`);
          set((state) => ({
            messages: state.messages.map((m) =>
              String(m._id) === String(messageId)
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

      setEditingMessage: (editingMessage) => set({ editingMessage }),
      cancelEditingMessage: () => set({ editingMessage: null }),

      editMessage: async (messageId, text) => {
        if (!messageId || !text?.trim()) return false;
        try {
          const res = await axiosInstance.put(`/messages/${messageId}/edit`, {
            text: text.trim(),
          });
          const updated = res.data;
          set((state) => ({
            editingMessage: null,
            messages: state.messages.map((m) =>
              String(m._id) === String(messageId)
                ? { ...m, text: updated.text, isEdited: true, editedAt: updated.editedAt }
                : m,
            ),
          }));
          toast.success("Message edited");
          return true;
        } catch (error) {
          console.error("editMessage error:", error);
          toast.error(error.response?.data?.message || "Failed to edit message");
          return false;
        }
      },

      toggleInChatSearch: (open) =>
        set((state) => ({
          isInChatSearchOpen: typeof open === "boolean" ? open : !state.isInChatSearchOpen,
          inChatSearchQuery: "",
          activeMatchId: null,
        })),

      setInChatSearchQuery: (query) => set({ inChatSearchQuery: query }),
      setActiveMatchId: (activeMatchId) => set({ activeMatchId }),

      // ── Draft Persistence ────────────────────────────────────────────────
      setDraft: (conversationId, text) => {
        if (!conversationId) return;
        set((state) => ({
          drafts: { ...state.drafts, [String(conversationId)]: text },
        }));
      },

      getDraft: (conversationId) => {
        if (!conversationId) return "";
        return get().drafts[String(conversationId)] || "";
      },

      clearDraft: (conversationId) => {
        if (!conversationId) return;
        set((state) => {
          const next = { ...state.drafts };
          delete next[String(conversationId)];
          return { drafts: next };
        });
      },

      // ── Global Search ────────────────────────────────────────────────────
      setGlobalSearchOpen: (open) => set({ isGlobalSearchOpen: Boolean(open), globalSearchResults: [] }),

      globalSearch: async (q) => {
        if (!q || q.trim().length < 2) {
          set({ globalSearchResults: [] });
          return;
        }
        set({ isGlobalSearching: true });
        try {
          const res = await axiosInstance.get(`/messages/search?q=${encodeURIComponent(q.trim())}`);
          set({ globalSearchResults: res.data || [] });
        } catch {
          set({ globalSearchResults: [] });
        } finally {
          set({ isGlobalSearching: false });
        }
      },

      // ── Link Preview ─────────────────────────────────────────────────────
      fetchLinkPreview: async (url) => {
        if (!url) return null;
        const cached = get().linkPreviews[url];
        if (cached !== undefined) return cached === "loading" ? null : cached;

        set((state) => ({ linkPreviews: { ...state.linkPreviews, [url]: "loading" } }));

        try {
          const res = await axiosInstance.get(`/messages/link-preview?url=${encodeURIComponent(url)}`);
          const data = res.data && res.data.title ? res.data : null;
          set((state) => ({ linkPreviews: { ...state.linkPreviews, [url]: data } }));
          return data;
        } catch {
          set((state) => ({ linkPreviews: { ...state.linkPreviews, [url]: null } }));
          return null;
        }
      },

      // ── Message Forwarding ───────────────────────────────────────────────
      setForwardingMessage: (message) => set({ forwardingMessage: message }),
      clearForwardingMessage: () => set({ forwardingMessage: null }),

      forwardMessage: async (messageId, toUserId) => {
        if (!messageId || !toUserId) return false;
        try {
          await axiosInstance.post("/messages/forward", { messageId, toUserId });
          toast.success("Message forwarded");
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to forward message");
          return false;
        }
      },

      // ── Per-Contact Mute ─────────────────────────────────────────────────
      muteConversation: async (partnerId, duration) => {
        if (!partnerId) return false;
        try {
          const res = await axiosInstance.post(`/messages/${partnerId}/mute`, { duration });
          const { mutedUntil } = res.data;
          set((state) => ({
            conversations: state.conversations.map((c) =>
              String(c._id) === String(partnerId)
                ? { ...c, isMuted: true, mutedUntil }
                : c,
            ),
          }));
          const labels = { "1h": "1 hour", "8h": "8 hours", "1w": "1 week", always: "forever" };
          toast.success(`Muted ${labels[duration] || ""}`);
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to mute conversation");
          return false;
        }
      },

      unmuteConversation: async (partnerId) => {
        if (!partnerId) return false;
        try {
          await axiosInstance.delete(`/messages/${partnerId}/mute`);
          set((state) => ({
            conversations: state.conversations.map((c) =>
              String(c._id) === String(partnerId)
                ? { ...c, isMuted: false, mutedUntil: null }
                : c,
            ),
          }));
          toast.success("Unmuted");
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to unmute");
          return false;
        }
      },

      // ── Message Pinning ──────────────────────────────────────────────────
      getPinnedMessages: async (partnerId) => {
        if (!partnerId) return;
        try {
          const res = await axiosInstance.get(`/messages/${partnerId}/pinned`);
          set({ pinnedMessages: res.data || [] });
        } catch {
          set({ pinnedMessages: [] });
        }
      },

      togglePinMessage: async (messageId) => {
        if (!messageId) return false;
        try {
          const res = await axiosInstance.post(`/messages/${messageId}/pin`);
          const { pinned, pinnedAt, pinnedBy } = res.data;
          set((state) => ({
            messages: state.messages.map((m) =>
              String(m._id) === String(messageId)
                ? { ...m, pinned, pinnedAt, pinnedBy }
                : m,
            ),
          }));
          const activeId = get().activeConversationId;
          if (activeId) {
            get().getPinnedMessages(activeId);
          }
          toast.success(pinned ? "Message pinned" : "Message unpinned");
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to update pin");
          return false;
        }
      },

      // ── Starred Messages ─────────────────────────────────────────────────
      toggleStarMessage: async (messageId) => {
        if (!messageId) return false;
        const myId = String(useAuthStore.getState().authUser?._id);

        // Optimistic update
        set((state) => ({
          messages: state.messages.map((m) => {
            if (String(m._id) !== String(messageId)) return m;
            const starredBy = Array.isArray(m.starredBy) ? [...m.starredBy] : [];
            const idx = starredBy.findIndex((uid) => String(uid) === myId);
            if (idx >= 0) starredBy.splice(idx, 1);
            else starredBy.push(myId);
            return { ...m, starredBy };
          }),
        }));

        try {
          const res = await axiosInstance.post(`/messages/${messageId}/star`);
          const { isStarred } = res.data;
          toast.success(isStarred ? "Message starred" : "Message unstarred");
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to update star");
          const activeId = get().activeConversationId;
          if (activeId) get().getMessages(activeId);
          return false;
        }
      },

      getStarredMessages: async (partnerId) => {
        if (!partnerId) return [];
        try {
          const res = await axiosInstance.get(`/messages/${partnerId}/starred`);
          return res.data || [];
        } catch {
          return [];
        }
      },

      // ── Jump / Highlight Message ─────────────────────────────────────────
      highlightMessage: (messageId) => {
        if (!messageId) return;
        set({ activeMatchId: String(messageId) });
        setTimeout(() => {
          set((state) => (state.activeMatchId === String(messageId) ? { activeMatchId: null } : {}));
        }, 2800);
      },
    }),
    {
      name: "imessage-storage",
      partialize: (state) => ({
        isSoundEnabled: state.isSoundEnabled,
        drafts: state.drafts,
      }),
    },
  ),
);
