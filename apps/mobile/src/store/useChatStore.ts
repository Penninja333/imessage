import { create } from "zustand";
import {
  fetchConversations,
  fetchUsers,
  fetchMessages,
  sendTextMessage as apiSendTextMessage,
  sendMediaMessage as apiSendMediaMessage,
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
  reactToMessage as apiReactToMessage,
  markSeen as apiMarkSeen,
  fetchPinnedMessages,
  togglePinMessage,
  toggleStarMessage,
  fetchChatTheme,
  setChatTheme,
  ApiMessage,
} from "../api/messages";
import { normalizeConversation, normalizePeer, ConversationItem, PeerProfile } from "../utils/normalize";

interface ChatState {
  conversations: ConversationItem[];
  users: PeerProfile[];
  messages: ApiMessage[];
  isLoadingConversations: boolean;
  isLoadingUsers: boolean;
  isLoadingMessages: boolean;
  isLoadingOlder: boolean;
  hasMoreMessages: boolean;
  activeConversationId: string | null;
  currentTheme: string;
  pinnedMessages: ApiMessage[];
  replyingTo: ApiMessage | null;
  editingMessage: ApiMessage | null;
  typingUser: string | null;
  searchQuery: string;

  setSearchQuery: (query: string) => void;
  setActiveConversationId: (id: string | null) => void;
  setReplyingTo: (msg: ApiMessage | null) => void;
  setEditingMessage: (msg: ApiMessage | null) => void;

  loadConversations: (onlineIds?: string[]) => Promise<void>;
  loadUsers: (onlineIds?: string[]) => Promise<void>;
  updateOnlineStatuses: (onlineIds: string[]) => void;

  loadMessages: (partnerId: string) => Promise<void>;
  loadOlderMessages: (partnerId: string) => Promise<void>;
  sendMessage: (partnerId: string, text: string) => Promise<boolean>;
  sendMedia: (partnerId: string, params: { fileUri: string; fileName?: string; fileType?: string; text?: string; viewOnce?: boolean }) => Promise<boolean>;
  editMessage: (messageId: string, text: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  markSeen: (partnerId: string) => Promise<void>;

  loadPinnedMessages: (partnerId: string) => Promise<void>;
  togglePin: (messageId: string) => Promise<void>;
  toggleStar: (messageId: string) => Promise<void>;
  loadChatTheme: (partnerId: string) => Promise<void>;
  updateTheme: (partnerId: string, themeId: string) => Promise<void>;

  sendTyping: (receiverId: string, socket: any) => void;
  sendStopTyping: (receiverId: string, socket: any) => void;

  // Real-time Socket Event Handlers
  handleNewMessage: (msg: ApiMessage) => void;
  handleMessageEdited: (data: { messageId: string; text: string; editedAt?: string }) => void;
  handleMessageDeleted: (data: { messageId: string }) => void;
  handleMessageReaction: (data: { messageId: string; reactions: { userId: string; emoji: string }[] }) => void;
  handleMessagesSeen: (data: { byUserId: string }) => void;
  handleUserTyping: (data: { senderId: string }) => void;
  handleUserStopTyping: (data: { senderId: string }) => void;
  handleMessagePinUpdated: (data: { messageId: string; pinned: boolean }) => void;
  handleMessageViewOnceOpened: (data: { messageId: string }) => void;
  handleChatThemeUpdated: (data: { themeId: string; partnerId: string }) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  users: [],
  messages: [],
  isLoadingConversations: false,
  isLoadingUsers: false,
  isLoadingMessages: false,
  isLoadingOlder: false,
  hasMoreMessages: false,
  activeConversationId: null,
  currentTheme: "default",
  pinnedMessages: [],
  replyingTo: null,
  editingMessage: null,
  typingUser: null,
  searchQuery: "",

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setActiveConversationId: (id: string | null) => {
    set({
      activeConversationId: id,
      messages: [],
      pinnedMessages: [],
      currentTheme: "default",
      replyingTo: null,
      editingMessage: null,
      typingUser: null,
      hasMoreMessages: false,
    });
    if (id) {
      get().loadMessages(id);
      get().loadPinnedMessages(id);
      get().loadChatTheme(id);
      get().markSeen(id);
    }
  },
  setReplyingTo: (msg: ApiMessage | null) => set({ replyingTo: msg }),
  setEditingMessage: (msg: ApiMessage | null) => set({ editingMessage: msg }),

  loadConversations: async (onlineIds = []) => {
    set({ isLoadingConversations: true });
    try {
      const raw = await fetchConversations();
      const normalized = raw.map((c) => normalizeConversation(c, onlineIds));
      set({ conversations: normalized });
    } catch (err: any) {
      console.warn("[ChatStore] loadConversations error:", err.message);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  loadUsers: async (onlineIds = []) => {
    set({ isLoadingUsers: true });
    try {
      const raw = await fetchUsers();
      const normalized = raw.map((u) => normalizePeer(u, onlineIds));
      set({ users: normalized });
    } catch (err: any) {
      console.warn("[ChatStore] loadUsers error:", err.message);
    } finally {
      set({ isLoadingUsers: false });
    }
  },

  updateOnlineStatuses: (onlineIds: string[]) => {
    set((state) => ({
      conversations: state.conversations.map((c) => ({
        ...c,
        peer: {
          ...c.peer,
          isOnline: onlineIds.some((oid) => String(oid) === c.peer.id),
        },
      })),
      users: state.users.map((u) => ({
        ...u,
        isOnline: onlineIds.some((oid) => String(oid) === u.id),
      })),
    }));
  },

  loadMessages: async (partnerId: string) => {
    if (!partnerId) return;
    set({ isLoadingMessages: true });
    try {
      const { messages, hasMore } = await fetchMessages(partnerId, 50);
      set({ messages: messages || [], hasMoreMessages: Boolean(hasMore) });
    } catch (err: any) {
      console.warn("[ChatStore] loadMessages error:", err.message);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  loadOlderMessages: async (partnerId: string) => {
    const { messages, isLoadingOlder, hasMoreMessages } = get();
    if (!partnerId || isLoadingOlder || !hasMoreMessages || messages.length === 0) return;

    const firstMsg = messages[0];
    if (!firstMsg) return;

    set({ isLoadingOlder: true });
    try {
      const { messages: older, hasMore } = await fetchMessages(partnerId, 50, firstMsg.createdAt);
      set((state) => ({
        messages: [...(older || []), ...state.messages],
        hasMoreMessages: Boolean(hasMore),
      }));
    } catch (err: any) {
      console.warn("[ChatStore] loadOlderMessages error:", err.message);
    } finally {
      set({ isLoadingOlder: false });
    }
  },

  sendMessage: async (partnerId: string, text: string) => {
    const trimmed = text.trim();
    if (!partnerId || !trimmed) return false;

    const replyingTo = get().replyingTo;
    set({ replyingTo: null });

    // Optimistic message append
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ApiMessage = {
      _id: tempId,
      tempId,
      senderId: "me",
      receiverId: partnerId,
      text: trimmed,
      seen: false,
      deleted: false,
      isEdited: false,
      replyTo: replyingTo
        ? {
            messageId: replyingTo._id,
            senderId: replyingTo.senderId,
            text: replyingTo.text,
            image: replyingTo.image,
            video: replyingTo.video,
            audio: replyingTo.audio,
            fileUrl: replyingTo.fileUrl,
            fileName: replyingTo.fileName,
          }
        : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({ messages: [...state.messages, optimisticMessage] }));

    try {
      const sent = await apiSendTextMessage(partnerId, trimmed, replyingTo?._id);
      set((state) => ({
        messages: state.messages.map((m) => (m.tempId === tempId ? sent : m)),
      }));
      return true;
    } catch (err: any) {
      console.warn("[ChatStore] sendMessage error:", err.message);
      // Remove failed optimistic message
      set((state) => ({
        messages: state.messages.filter((m) => m.tempId !== tempId),
      }));
      return false;
    }
  },

  editMessage: async (messageId: string, text: string) => {
    const trimmed = text.trim();
    if (!messageId || !trimmed) return false;

    try {
      const updated = await apiEditMessage(messageId, trimmed);
      set((state) => ({
        messages: state.messages.map((m) => (m._id === messageId ? updated : m)),
        editingMessage: null,
      }));
      return true;
    } catch (err: any) {
      console.warn("[ChatStore] editMessage error:", err.message);
      return false;
    }
  },

  deleteMessage: async (messageId: string) => {
    if (!messageId) return false;
    try {
      await apiDeleteMessage(messageId);
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, deleted: true, text: "This message was deleted" } : m
        ),
      }));
      return true;
    } catch (err: any) {
      console.warn("[ChatStore] deleteMessage error:", err.message);
      return false;
    }
  },

  toggleReaction: async (messageId: string, emoji: string) => {
    if (!messageId) return;
    try {
      const result = await apiReactToMessage(messageId, emoji);
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, reactions: result.reactions } : m
        ),
      }));
    } catch (err: any) {
      console.warn("[ChatStore] toggleReaction error:", err.message);
    }
  },

  markSeen: async (partnerId: string) => {
    if (!partnerId) return;
    try {
      await apiMarkSeen(partnerId);
    } catch {}
  },

  sendTyping: (receiverId: string, socket: any) => {
    if (socket?.connected && receiverId) {
      socket.emit("typing", { receiverId });
    }
  },

  sendStopTyping: (receiverId: string, socket: any) => {
    if (socket?.connected && receiverId) {
      socket.emit("stopTyping", { receiverId });
    }
  },

  handleNewMessage: (msg: ApiMessage) => {
    const activeId = get().activeConversationId;
    const isCurrentChat =
      String(msg.senderId) === String(activeId) || String(msg.receiverId) === String(activeId);

    if (isCurrentChat) {
      set((state) => {
        // Prevent duplicate append if message already exists
        const exists = state.messages.some((m) => m._id === msg._id || (m.tempId && m.tempId === msg.tempId));
        if (exists) {
          return {
            messages: state.messages.map((m) => (m._id === msg._id ? msg : m)),
          };
        }
        return { messages: [...state.messages, msg] };
      });
      // Mark as seen if we are actively viewing this conversation
      if (activeId && String(msg.senderId) === String(activeId)) {
        get().markSeen(activeId);
      }
    }

    // Refresh conversations list to update lastMessage and order
    get().loadConversations();
  },

  handleMessageEdited: ({ messageId, text, editedAt }) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId
          ? { ...m, text, isEdited: true, editedAt: editedAt || new Date().toISOString() }
          : m
      ),
    }));
  },

  handleMessageDeleted: ({ messageId }) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId
          ? { ...m, deleted: true, text: "This message was deleted" }
          : m
      ),
    }));
  },

  handleMessageReaction: ({ messageId, reactions }) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, reactions } : m
      ),
    }));
  },

  handleMessagesSeen: ({ byUserId }) => {
    const activeId = get().activeConversationId;
    if (String(byUserId) === String(activeId)) {
      set((state) => ({
        messages: state.messages.map((m) => (m.seen ? m : { ...m, seen: true })),
      }));
    }
  },

  handleUserTyping: ({ senderId }) => {
    const activeId = get().activeConversationId;
    if (String(senderId) === String(activeId)) {
      set({ typingUser: senderId });
    }
  },

  handleUserStopTyping: ({ senderId }) => {
    const activeId = get().activeConversationId;
    if (String(senderId) === String(activeId)) {
      set({ typingUser: null });
    }
  },

  sendMedia: async (partnerId: string, params) => {
    if (!partnerId || !params.fileUri) return false;

    const replyingTo = get().replyingTo;
    set({ replyingTo: null });

    const tempId = `temp-${Date.now()}`;
    const isImage = params.fileType?.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(params.fileUri);
    const isAudio = params.fileType?.startsWith("audio/") || /\.(m4a|aac|mp3|wav|ogg)$/i.test(params.fileUri);

    const optimisticMessage: ApiMessage = {
      _id: tempId,
      tempId,
      senderId: "me",
      receiverId: partnerId,
      text: params.text || "",
      image: isImage ? params.fileUri : null,
      audio: isAudio ? params.fileUri : null,
      fileUrl: !isImage && !isAudio ? params.fileUri : null,
      fileName: params.fileName || null,
      viewOnce: Boolean(params.viewOnce),
      viewedOnce: false,
      seen: false,
      deleted: false,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({ messages: [...state.messages, optimisticMessage] }));

    try {
      const sent = await apiSendMediaMessage({
        receiverId: partnerId,
        fileUri: params.fileUri,
        fileName: params.fileName,
        fileType: params.fileType,
        text: params.text,
        replyToId: replyingTo?._id,
        viewOnce: params.viewOnce,
      });

      set((state) => ({
        messages: state.messages.map((m) => (m.tempId === tempId ? sent : m)),
      }));
      return true;
    } catch (err: any) {
      console.warn("[ChatStore] sendMedia error:", err.message);
      set((state) => ({
        messages: state.messages.filter((m) => m.tempId !== tempId),
      }));
      return false;
    }
  },

  loadPinnedMessages: async (partnerId: string) => {
    if (!partnerId) return;
    try {
      const pinned = await fetchPinnedMessages(partnerId);
      set({ pinnedMessages: pinned || [] });
    } catch (err: any) {
      console.warn("[ChatStore] loadPinnedMessages error:", err.message);
    }
  },

  togglePin: async (messageId: string) => {
    if (!messageId) return;
    try {
      const res = await togglePinMessage(messageId);
      set((state) => {
        const isPinned = Boolean(res.pinned);
        const updatedMessages = state.messages.map((m) =>
          m._id === messageId ? { ...m, pinned: isPinned } : m
        );
        const pinnedList = isPinned
          ? [...state.pinnedMessages.filter((m) => m._id !== messageId), state.messages.find((m) => m._id === messageId) || ({} as any)]
          : state.pinnedMessages.filter((m) => m._id !== messageId);
        return {
          messages: updatedMessages,
          pinnedMessages: pinnedList.filter((m) => m && m._id),
        };
      });
    } catch (err: any) {
      console.warn("[ChatStore] togglePin error:", err.message);
    }
  },

  toggleStar: async (messageId: string) => {
    if (!messageId) return;
    try {
      await toggleStarMessage(messageId);
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId
            ? { ...m, starredBy: (m.starredBy || []).includes("me") ? [] : ["me"] }
            : m
        ),
      }));
    } catch (err: any) {
      console.warn("[ChatStore] toggleStar error:", err.message);
    }
  },

  loadChatTheme: async (partnerId: string) => {
    if (!partnerId) return;
    try {
      const themeId = await fetchChatTheme(partnerId);
      set({ currentTheme: themeId });
    } catch {
      set({ currentTheme: "default" });
    }
  },

  updateTheme: async (partnerId: string, themeId: string) => {
    if (!partnerId) return;
    try {
      await setChatTheme(partnerId, themeId);
      set({ currentTheme: themeId });
    } catch (err: any) {
      console.warn("[ChatStore] updateTheme error:", err.message);
    }
  },

  handleMessagePinUpdated: ({ messageId, pinned }) => {
    set((state) => {
      const updatedMessages = state.messages.map((m) =>
        m._id === messageId ? { ...m, pinned } : m
      );
      const pinnedList = pinned
        ? [...state.pinnedMessages.filter((m) => m._id !== messageId), updatedMessages.find((m) => m._id === messageId) || ({} as any)]
        : state.pinnedMessages.filter((m) => m._id !== messageId);
      return {
        messages: updatedMessages,
        pinnedMessages: pinnedList.filter((m) => m && m._id),
      };
    });
  },

  handleMessageViewOnceOpened: ({ messageId }) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, viewedOnce: true, image: null } : m
      ),
    }));
  },

  handleChatThemeUpdated: ({ themeId, partnerId }) => {
    const activeId = get().activeConversationId;
    if (String(partnerId) === String(activeId)) {
      set({ currentTheme: themeId });
    }
  },
}));

