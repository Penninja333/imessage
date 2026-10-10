import { apiClient } from "./client";

export interface ApiUser {
  _id: string;
  fullName: string;
  email: string;
  profilePic?: string;
  nickname?: string | null;
  myNickname?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiConversation {
  _id: string;
  fullName: string;
  email: string;
  profilePic?: string;
  nickname?: string | null;
  myNickname?: string | null;
  lastMessage?: string;
  lastMessageAt?: string | null;
  unreadCount?: number;
  isMuted?: boolean;
  mutedUntil?: string | null;
}

export interface ApiMessage {
  _id: string;
  tempId?: string;
  senderId: string;
  receiverId: string;
  text?: string;
  image?: string | null;
  video?: string | null;
  audio?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  viewOnce?: boolean;
  viewedOnce?: boolean;
  seen?: boolean;
  deleted?: boolean;
  isEdited?: boolean;
  editedAt?: string | null;
  reactions?: { userId: string; emoji: string }[];
  pinned?: boolean;
  pinnedAt?: string | null;
  pinnedBy?: string | null;
  starredBy?: string[];
  replyTo?: {
    messageId: string;
    senderId: string;
    text?: string;
    image?: string | null;
    video?: string | null;
    audio?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchUsers(): Promise<ApiUser[]> {
  const res = await apiClient.get<ApiUser[]>("/messages/users");
  return res.data || [];
}

export async function fetchConversations(): Promise<ApiConversation[]> {
  const res = await apiClient.get<ApiConversation[]>("/messages/conversations");
  return res.data || [];
}

export async function fetchMessages(
  userId: string,
  limit = 50,
  before?: string
): Promise<{ messages: ApiMessage[]; hasMore: boolean }> {
  let url = `/messages/${userId}?limit=${limit}`;
  if (before) {
    url += `&before=${encodeURIComponent(before)}`;
  }
  const res = await apiClient.get(url);
  return res.data;
}

export async function sendTextMessage(
  receiverId: string,
  text: string,
  replyToId?: string
): Promise<ApiMessage> {
  const payload: any = { text };
  if (replyToId) payload.replyToId = replyToId;
  const res = await apiClient.post<ApiMessage>(`/messages/send/${receiverId}`, payload);
  return res.data;
}

export async function editMessage(messageId: string, text: string): Promise<ApiMessage> {
  const res = await apiClient.put<ApiMessage>(`/messages/${messageId}/edit`, { text });
  return res.data;
}

export async function deleteMessage(messageId: string): Promise<void> {
  await apiClient.delete(`/messages/${messageId}`);
}

export async function reactToMessage(
  messageId: string,
  emoji: string
): Promise<{ reactions: { userId: string; emoji: string }[] }> {
  const res = await apiClient.post(`/messages/${messageId}/react`, { emoji });
  return res.data;
}

export async function markSeen(userId: string): Promise<void> {
  await apiClient.post(`/messages/${userId}/seen`);
}
