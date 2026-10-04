import { useMemo } from "react";
import { getInitials, useSelectedConversation } from "../../hooks/useSelectedConversation";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { APP_NAME, AppLogo } from "../AppLogo";
import { UserButton } from "@clerk/react";

import { SearchField, Tabs } from "@heroui/react";
import { ArrowUpCircleIcon, MessageSquareIcon, RefreshCwIcon, UsersIcon, BellRingIcon } from "lucide-react";
import { ConversationRow } from "./ConversationRow";
import { usePwaUpdateStore } from "../../store/usePwaUpdateStore";
import { usePermissionsStore } from "../../store/usePermissionsStore";

function mapUserForList(user, onlineUsers) {
  const displayName = user.nickname || user.fullName;
  const isOnline = onlineUsers.some((id) => String(id) === String(user._id));
  return {
    conversationId: String(user._id),
    id: String(user._id),
    name: displayName,
    avatarUrl: user.profilePic,
    initials: getInitials(displayName),
    isOnline,
    hasNickname: Boolean(user.nickname),
    lastMessage: user.lastMessage || "",
    lastMessageAt: user.lastMessageAt || null,
    unreadCount: user.unreadCount || 0,
    peer: {
      name: displayName,
      avatarUrl: user.profilePic,
      initials: getInitials(displayName),
      isOnline,
    },
  };
}

function ChatSidebar() {
  const conversations = useChatStore((state) => state.conversations);

  const users = useChatStore((state) => state.users);

  const searchQuery = useChatStore((state) => state.searchQuery);
  const setSearchQuery = useChatStore((state) => state.setSearchQuery);

  const sidebarTab = useChatStore((state) => state.sidebarTab);
  const setSidebarTab = useChatStore((state) => state.setSidebarTab);

  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);

  const onlineUsers = useAuthStore((state) => state.onlineUsers);

  const needRefresh = usePwaUpdateStore((state) => state.needRefresh);
  const isChecking = usePwaUpdateStore((state) => state.isChecking);
  const checkForUpdate = usePwaUpdateStore((state) => state.checkForUpdate);
  const updateApp = usePwaUpdateStore((state) => state.updateApp);

  const { activeConversationId, isLargeScreen } = useSelectedConversation();

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const conversationUsers = useMemo(() => {
    return conversations.map((user) => mapUserForList(user, onlineUsers));
  }, [conversations, onlineUsers]);

  const allUsers = useMemo(() => {
    return users.map((user) => mapUserForList(user, onlineUsers));
  }, [users, onlineUsers]);

  const filteredConversations = useMemo(() => {
    if (!normalizedSearchQuery) return conversationUsers;
    return conversationUsers.filter((conversation) =>
      conversation.peer.name.toLowerCase().includes(normalizedSearchQuery),
    );
  }, [conversationUsers, normalizedSearchQuery]);

  const filteredUsers = useMemo(() => {
    if (!normalizedSearchQuery) return allUsers;
    return allUsers.filter((user) =>
      user.name.toLowerCase().includes(normalizedSearchQuery),
    );
  }, [allUsers, normalizedSearchQuery]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversations]);

  return (
    <aside
      className={`w-full shrink-0 flex-col overflow-hidden border-r border-border lg:w-72 xl:w-80 ${
        !isLargeScreen && activeConversationId ? "hidden lg:flex" : "flex"
      }`}
    >
      <div className="shrink-0 border-b border-border px-2 pb-2 pt-2.5 sm:px-3 sm:pt-3">
        <div className="flex items-center gap-2 px-0.5 sm:gap-2.5 sm:px-1">
          <AppLogo size={32} className="size-8 shrink-0 rounded-[9px] sm:size-8.5" alt="" />
          <p className="flex-1 truncate text-lg font-bold tracking-tight sm:text-[22px]">
            {APP_NAME}
          </p>
          {needRefresh ? (
            <button
              type="button"
              onClick={updateApp}
              className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground shadow-sm animate-pulse active:scale-95 transition"
              title="New version ready! Tap to update"
            >
              <ArrowUpCircleIcon className="size-3.5" />
              <span>Update</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => checkForUpdate(true)}
              disabled={isChecking}
              className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground active:scale-95 transition"
              title="Check for updates"
              aria-label="Check for updates"
            >
              <RefreshCwIcon className={`size-4 ${isChecking ? "animate-spin text-accent" : ""}`} />
            </button>
          )}
          <button
            type="button"
            onClick={() => usePermissionsStore.getState().openModal()}
            className="relative flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground active:scale-95 transition"
            title="App Permissions (Notifications & Mic)"
            aria-label="App Permissions"
          >
            <BellRingIcon className="size-4" />
            {typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted" ? (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-500 animate-pulse" />
            ) : null}
          </button>

          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-8",
              },
            }}
          />
        </div>
      </div>

      <Tabs
        selectedKey={sidebarTab}
        onSelectionChange={(key) => setSidebarTab(String(key))}
        variant="secondary"
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <div className="shrink-0 border-b border-border px-3 pb-2 pt-2">
          <SearchField
            fullWidth
            variant="secondary"
            className="w-full"
            value={searchQuery}
            onChange={setSearchQuery}
          >
            <SearchField.Group className="rounded-xl">
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search" />
              {searchQuery ? <SearchField.ClearButton /> : null}
            </SearchField.Group>
          </SearchField>
        </div>

        <Tabs.ListContainer className="shrink-0 border-b border-border px-2 pb-2 pt-1">
          <Tabs.List className="w-full gap-0.5">
            <Tabs.Tab id="chats" className="flex-1 justify-center gap-1.5">
              <MessageSquareIcon className="size-3.5 opacity-80" aria-hidden />
              <span>Chats</span>
              {totalUnread > 0 ? (
                <span className="flex items-center justify-center rounded-full bg-accent px-1.5 py-px text-[10px] font-bold text-accent-foreground min-w-[18px]">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              ) : null}
            </Tabs.Tab>
            <Tabs.Tab id="users" className="flex-1 justify-center gap-1.5">
              <UsersIcon className="size-3.5 opacity-80" aria-hidden />
              <span>Users</span>
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel
          id="chats"
          className="flex-1 overflow-x-hidden overflow-y-auto outline-none"
        >
          {filteredConversations.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No conversations match your search.
            </p>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                user={conversation}
                selected={conversation.id === activeConversationId}
                onSelect={() => setActiveConversationId(conversation.id)}
              />
            ))
          )}
        </Tabs.Panel>

        <Tabs.Panel id="users" className="flex-1 overflow-x-hidden overflow-y-auto outline-none">
          {filteredUsers.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">No people match your search.</p>
          ) : (
            filteredUsers.map((user) => (
              <ConversationRow
                key={user.conversationId}
                user={user}
                selected={user.conversationId === activeConversationId}
                onSelect={() => setActiveConversationId(user.conversationId)}
              />
            ))
          )}
        </Tabs.Panel>
      </Tabs>
    </aside>
  );
}
export default ChatSidebar;
