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
): Promise<{ messages: any[]; hasMore: boolean }> {
  let url = `/messages/${userId}?limit=${limit}`;
  if (before) {
    url += `&before=${encodeURIComponent(before)}`;
  }
  const res = await apiClient.get(url);
  return res.data;
}

export async function markSeen(userId: string): Promise<void> {
  await apiClient.post(`/messages/${userId}/seen`);
}
