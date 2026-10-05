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
        isEdited: Boolean(message.isEdited),
        editedAt: message.editedAt || null,
        forwardedFrom: message.forwardedFrom
          ? {
              messageId: String(message.forwardedFrom.messageId),
              senderId: String(message.forwardedFrom.senderId),
            }
          : null,
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


export function useSelectedConversation() {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const conversations = useChatStore((state) => state.conversations);
  const users = useChatStore((state) => state.users);
  const messages = useChatStore((state) => state.messages);

  const authUser = useAuthStore((state) => state.authUser);
  const onlineUsers = useAuthStore((state) => state.onlineUsers);

  const isLargeScreen = useMediaQuery("(min-width: 1440px)");

  // Resolved user — changes only when activeConversationId, users, or conversations list changes
  const selectedUser = useMemo(() => {
    if (!activeConversationId) return null;
    return (
      users.find((user) => String(user._id) === String(activeConversationId)) ||
      conversations.find((user) => String(user._id) === String(activeConversationId)) ||
      null
    );
  }, [activeConversationId, users, conversations]);

  // Map raw messages — only re-runs when the messages array or authUser changes.
  // Online status is kept separate to avoid re-mapping messages on every socket ping.
  const myId = authUser?._id ? String(authUser._id) : "";
  const mappedMessages = useMemo(
    () => messages.map((m) => getCachedMappedMessage(m, myId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, myId],
  );

  const activeConversation = useMemo(() => {
    if (!selectedUser) return null;
    const displayName = selectedUser.nickname || selectedUser.fullName;
    const convData = conversations.find((c) => String(c._id) === String(selectedUser._id));
    const isMuted = Boolean(convData?.isMuted);
    const mutedUntil = convData?.mutedUntil || null;

    return {
      id: String(selectedUser._id),
      isMuted,
      mutedUntil,
      peer: {
        id: String(selectedUser._id),
        name: displayName,
        fullName: selectedUser.fullName,
        nickname: selectedUser.nickname || null,
        myNickname: selectedUser.myNickname || null,
        theirNicknameForMe: selectedUser.myNickname || null,
        subtitle: selectedUser.email,
        isOnline: onlineUsers.some((id) => String(id) === String(selectedUser._id)),
        avatarUrl: selectedUser.profilePic,
        initials: getInitials(displayName),
      },
      messages: mappedMessages,
    };
  }, [selectedUser, mappedMessages, onlineUsers, conversations]);

  return {
    activeConversation,
    activeConversationId,
    isLargeScreen,
  };
}
