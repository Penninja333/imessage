import { create } from "zustand";
import { fetchConversations, fetchUsers, ApiConversation, ApiUser } from "../api/messages";
import { normalizeConversation, normalizePeer, ConversationItem, PeerProfile } from "../utils/normalize";

interface ChatState {
  conversations: ConversationItem[];
  users: PeerProfile[];
  isLoadingConversations: boolean;
  isLoadingUsers: boolean;
  activeConversationId: string | null;
  searchQuery: string;

  setSearchQuery: (query: string) => void;
  setActiveConversationId: (id: string | null) => void;
  loadConversations: (onlineIds?: string[]) => Promise<void>;
  loadUsers: (onlineIds?: string[]) => Promise<void>;
  updateOnlineStatuses: (onlineIds: string[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  users: [],
  isLoadingConversations: false,
  isLoadingUsers: false,
  activeConversationId: null,
  searchQuery: "",

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setActiveConversationId: (id: string | null) => set({ activeConversationId: id }),

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
}));
