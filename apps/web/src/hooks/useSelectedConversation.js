import { useMemo } from "react";
import { useMediaQuery } from "./useMediaQuery";
import { formatMessageTime } from "../lib/utils";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

// John Doe -> JD
export function getInitials(name) {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .map((namePart) => namePart[0])
    .join("")
    .toUpperCase();
}

const messageCache = new WeakMap();

function getCachedMappedMessage(message, myId) {
  let cached = messageCache.get(message);
  if (!cached || cached.myId !== myId) {
    cached = {
      myId,
      mapped: {
        id: message._id,
        role: String(message.senderId) === String(myId) ? "me" : "them",
        text: message.text || "",
        time: formatMessageTime(message.createdAt),
        imageUrl: message.image,
        videoUrl: message.video,
        audioUrl: message.audio,
        isSystem: Boolean(message.isSystem),
        reactions: message.reactions || [],
        deleted: Boolean(message.deleted),
        seen: Boolean(message.seen),
        createdAt: message.createdAt,
        replyTo: message.replyTo
          ? {
              messageId: String(message.replyTo.messageId),
              senderId: String(message.replyTo.senderId),
              isOwnSender: String(message.replyTo.senderId) === String(myId),
              text: message.replyTo.text || "",
              imageUrl: message.replyTo.image || null,
              videoUrl: message.replyTo.video || null,
              audioUrl: message.replyTo.audio || null,
            }
          : null,
      },
    };
    messageCache.set(message, cached);
  }
  return cached.mapped;
}

function mapUserToConversation({ user, messages, authUser, onlineUsers }) {
  const myId = authUser?._id ? String(authUser._id) : "";
  const mappedMessages = messages.map((m) => getCachedMappedMessage(m, myId));

  const displayName = user.nickname || user.fullName;

  return {
    id: String(user._id),
    peer: {
      id: String(user._id),
      name: displayName,
      fullName: user.fullName,
      nickname: user.nickname || null,
      myNickname: user.myNickname || null,
      theirNicknameForMe: user.myNickname || null,
      subtitle: user.email,
      isOnline: onlineUsers.some((id) => String(id) === String(user._id)),
      avatarUrl: user.profilePic,
      initials: getInitials(displayName),
    },
    messages: mappedMessages,
  };
}

export function useSelectedConversation() {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const conversations = useChatStore((state) => state.conversations);
  const users = useChatStore((state) => state.users);
  const messages = useChatStore((state) => state.messages);

  const authUser = useAuthStore((state) => state.authUser);
  const onlineUsers = useAuthStore((state) => state.onlineUsers);

  const isLargeScreen = useMediaQuery("(min-width: 1440px)");

  const selectedUser = useMemo(() => {
    if (!activeConversationId) return null;
    return (
      users.find((user) => String(user._id) === String(activeConversationId)) ||
      conversations.find((user) => String(user._id) === String(activeConversationId)) ||
      null
    );
  }, [activeConversationId, users, conversations]);

  const activeConversation = useMemo(() => {
    if (!selectedUser) return null;
    return mapUserToConversation({ user: selectedUser, messages, authUser, onlineUsers });
  }, [selectedUser, messages, authUser, onlineUsers]);

  return {
    activeConversation,
    activeConversationId,
    isLargeScreen,
  };
}
