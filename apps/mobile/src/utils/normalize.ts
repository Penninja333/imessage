export interface PeerProfile {
  id: string;
  name: string;
  fullName: string;
  nickname: string | null;
  subtitle: string;
  avatarUrl: string;
  initials: string;
  isOnline: boolean;
}

export interface ConversationItem {
  id: string;
  conversationId: string;
  peer: PeerProfile;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
  isMuted: boolean;
  mutedUntil: string | null;
}

export function getInitials(name?: string | null): string {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatTime(dateStr?: string | Date | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return "Yesterday";

    const daysDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    }

    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function normalizePeer(raw: any, onlineIds: string[] = []): PeerProfile {
  const id = String(raw?._id || raw?.id || "");
  const fullName = String(raw?.fullName || raw?.name || "").trim() || "User";
  const nickname = raw?.nickname ? String(raw.nickname).trim() : null;
  const name = nickname || fullName;
  const avatarUrl = String(raw?.profilePic || raw?.avatarUrl || "");
  const subtitle = String(raw?.email || "");
  const isOnline = onlineIds.some((onlineId) => String(onlineId) === id);

  return {
    id,
    name,
    fullName,
    nickname,
    subtitle,
    avatarUrl,
    initials: getInitials(name),
    isOnline,
  };
}

export function normalizeConversation(raw: any, onlineIds: string[] = []): ConversationItem {
  const id = String(raw?._id || raw?.id || "");
  const peer = normalizePeer(raw, onlineIds);
  const lastMessage = String(raw?.lastMessage || "");
  const lastMessageAt = raw?.lastMessageAt ? String(raw.lastMessageAt) : null;
  const unreadCount = typeof raw?.unreadCount === "number" ? raw.unreadCount : 0;
  const isMuted = Boolean(raw?.isMuted);
  const mutedUntil = raw?.mutedUntil ? String(raw.mutedUntil) : null;

  return {
    id,
    conversationId: id,
    peer,
    lastMessage,
    lastMessageAt,
    unreadCount,
    isMuted,
    mutedUntil,
  };
}
