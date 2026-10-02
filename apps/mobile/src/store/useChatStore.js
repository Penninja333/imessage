import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from './useAuthStore';

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: {}, // { [userId]: boolean }

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get('/messages/users');
      set({ users: res.data });
    } catch (error) {
      console.warn('Error fetching users:', error.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      console.warn('Error fetching messages:', error.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
    if (selectedUser) {
      get().getMessages(selectedUser._id);
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    if (!selectedUser) return;

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      console.warn('Error sending message:', error.message);
      throw error;
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
      const updated = res.data;
      set({
        messages: get().messages.map((m) => (m._id === messageId ? { ...m, reactions: updated.reactions } : m)),
      });
    } catch (error) {
      console.warn('Error reacting to message:', error.message);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, isDeleted: true, text: 'This message was deleted', image: null } : m
        ),
      });
    } catch (error) {
      console.warn('Error deleting message:', error.message);
    }
  },

  setNickname: async (targetUserId, nickname) => {
    try {
      const res = await axiosInstance.put(`/messages/nickname/${targetUserId}`, { nickname });
      const { updatedNickname } = res.data;

      // Update in users list
      set({
        users: get().users.map((u) => (u._id === targetUserId ? { ...u, nickname: updatedNickname } : u)),
        selectedUser:
          get().selectedUser?._id === targetUserId
            ? { ...get().selectedUser, nickname: updatedNickname }
            : get().selectedUser,
      });
    } catch (error) {
      console.warn('Error updating nickname:', error.message);
      throw error;
    }
  },

  sendTyping: (isTyping) => {
    const socket = useAuthStore.getState().socket;
    const { selectedUser } = get();
    if (!socket || !selectedUser) return;

    socket.emit(isTyping ? 'typing' : 'stopTyping', {
      recipientId: selectedUser._id,
    });
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on('newMessage', (newMessage) => {
      const { selectedUser, messages } = get();
      const isFromSelected =
        selectedUser &&
        (newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id);

      if (isFromSelected) {
        set({ messages: [...messages, newMessage] });
      }

      // Refresh user list for last message & unread badge
      get().getUsers();
    });

    socket.on('messageReaction', ({ messageId, reactions }) => {
      set({
        messages: get().messages.map((m) => (m._id === messageId ? { ...m, reactions } : m)),
      });
    });

    socket.on('messageDeleted', ({ messageId }) => {
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, isDeleted: true, text: 'This message was deleted', image: null } : m
        ),
      });
    });

    socket.on('typing', ({ senderId }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [senderId]: true },
      }));
    });

    socket.on('stopTyping', ({ senderId }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [senderId]: false },
      }));
    });

    socket.on('nicknameUpdated', ({ setterId, targetId, nickname }) => {
      const authUser = useAuthStore.getState().authUser;
      const myId = authUser?._id;

      set((state) => {
        const updatedUsers = state.users.map((u) => {
          if (u._id === setterId && targetId === myId) {
            return { ...u, theirNicknameForMe: nickname };
          }
          if (u._id === targetId && setterId === myId) {
            return { ...u, nickname: nickname };
          }
          return u;
        });

        let updatedSelected = state.selectedUser;
        if (updatedSelected) {
          if (updatedSelected._id === setterId && targetId === myId) {
            updatedSelected = { ...updatedSelected, theirNicknameForMe: nickname };
          } else if (updatedSelected._id === targetId && setterId === myId) {
            updatedSelected = { ...updatedSelected, nickname: nickname };
          }
        }

        return { users: updatedUsers, selectedUser: updatedSelected };
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off('newMessage');
    socket.off('messageReaction');
    socket.off('messageDeleted');
    socket.off('typing');
    socket.off('stopTyping');
    socket.off('nicknameUpdated');
  },
}));
