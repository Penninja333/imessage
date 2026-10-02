import { Avatar } from "@heroui/react";
import { AvatarWithOnlineIndicator } from "./AvatarWithOnlineIndicator";
import { formatConversationTime } from "../../lib/utils";

export function ConversationRow({ user, selected, onSelect }) {
  const hasUnread = Boolean(user.unreadCount && user.unreadCount > 0);
  const formattedTime = formatConversationTime(user.lastMessageAt);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-border/70 px-3 py-2.5 text-left transition-colors hover:bg-surface active:bg-surface-elevated ${
        selected ? "bg-accent-soft" : ""
      }`}
    >
      <AvatarWithOnlineIndicator isOnline={user.isOnline ?? false}>
        <Avatar className="size-12 shrink-0">
          <Avatar.Image alt={user.name} src={user.avatarUrl} />
          <Avatar.Fallback className="text-sm font-medium">{user.initials}</Avatar.Fallback>
        </Avatar>
      </AvatarWithOnlineIndicator>

      <div className="min-w-0 flex-1">
        {/* Top line: Name + Timestamp */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p
              className={`truncate text-[15px] ${
                hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
              }`}
            >
              {user.name}
            </p>
            {user.hasNickname ? (
              <span className="shrink-0 rounded bg-accent/10 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-accent">
                nick
              </span>
            ) : null}
          </div>

          {formattedTime ? (
            <span
              className={`shrink-0 text-[11px] tabular-nums ${
                hasUnread ? "font-semibold text-accent" : "text-muted"
              }`}
            >
              {formattedTime}
            </span>
          ) : null}
        </div>

        {/* Bottom line: Last message preview + Unread badge */}
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={`min-w-0 flex-1 truncate text-xs ${
              hasUnread
                ? "font-medium text-foreground"
                : "text-muted"
            }`}
          >
            {user.lastMessage || "Tap to chat"}
          </p>

          {hasUnread ? (
            <span className="flex shrink-0 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold text-accent-foreground min-w-[20px] shadow-xs">
              {user.unreadCount > 99 ? "99+" : user.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
