import { Avatar, Button } from "@heroui/react";
import {
  ChevronLeftIcon,
  SparklesIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
  MoreVerticalIcon,
  MoonIcon,
  SunIcon,
  PaletteIcon,
  ArrowUpCircleIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useState } from "react";
import { AppLogo } from "../AppLogo";
import { AvatarWithOnlineIndicator } from "./AvatarWithOnlineIndicator";
import { NicknameDetailsModal } from "./NicknameDetailsModal";

import { ThemePresetPicker } from "../ThemePresetPicker";
import { ThemeToggle } from "../ThemeToggle";
import { WallpaperPicker } from "../WallpaperPicker";
import { useTheme } from "../../context/theme";

import { useChatStore } from "../../store/useChatStore";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { usePwaUpdateStore } from "../../store/usePwaUpdateStore";

export function ChatHeader() {
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const setSoundEnabled = useChatStore((state) => state.setSoundEnabled);
  const typingUser = useChatStore((state) => state.typingUser);

  const needRefresh = usePwaUpdateStore((state) => state.needRefresh);
  const isChecking = usePwaUpdateStore((state) => state.isChecking);
  const checkForUpdate = usePwaUpdateStore((state) => state.checkForUpdate);
  const updateApp = usePwaUpdateStore((state) => state.updateApp);

  const { theme, setTheme } = useTheme();
  const { activeConversation, activeConversationId, isLargeScreen } = useSelectedConversation();

  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showMobileOptions, setShowMobileOptions] = useState(false);

  const isPartnerTyping =
    typingUser && String(typingUser) === String(activeConversationId);

  const conversations = useChatStore((state) => state.conversations);
  const otherPendingCount = conversations.reduce(
    (acc, c) =>
      String(c._id) !== String(activeConversationId) ? acc + (c.unreadCount || 0) : acc,
    0,
  );

  return (
    <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-border bg-background/95 backdrop-blur-md px-2 py-2 sm:px-3 sm:py-2.5">
      {/* Left side: Back button (mobile) + Contact info */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        {activeConversation && !isLargeScreen ? (
          <Button
            variant="ghost"
            className="flex items-center gap-0.5 text-accent hover:bg-accent/10 active:scale-95 px-1 py-1 rounded-full h-9 shrink-0"
            onPress={() => setActiveConversationId(null)}
            aria-label="Back to conversations"
          >
            <ChevronLeftIcon className="size-6 shrink-0" strokeWidth={2.5} />
            {otherPendingCount > 0 ? (
              <span className="flex items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold text-accent-foreground min-w-[20px] shadow-xs">
                {otherPendingCount > 99 ? "99+" : otherPendingCount}
              </span>
            ) : null}
          </Button>
        ) : null}

        {activeConversation ? (
          <div
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 hover:opacity-90 transition-opacity"
            onClick={() => setShowNicknameModal(true)}
          >
            <AvatarWithOnlineIndicator isOnline={activeConversation.peer.isOnline ?? false}>
              <Avatar className="size-9 shrink-0">
                <Avatar.Image
                  alt={activeConversation.peer.name}
                  src={activeConversation.peer.avatarUrl}
                />
                <Avatar.Fallback className="text-sm font-medium">
                  {activeConversation.peer.initials}
                </Avatar.Fallback>
              </Avatar>
            </AvatarWithOnlineIndicator>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-sm font-bold sm:text-base leading-tight">
                  {activeConversation.peer.name}
                </h2>
                {activeConversation.peer.nickname ? (
                  <span className="hidden sm:inline truncate text-[11px] text-muted font-normal">
                    ({activeConversation.peer.fullName})
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-1 text-xs">
                {isPartnerTyping ? (
                  <span className="text-accent font-medium animate-pulse">typing…</span>
                ) : activeConversation.peer.isOnline ? (
                  <span className="text-success font-medium">Online</span>
                ) : (
                  <span className="text-muted">Offline</span>
                )}

                {activeConversation.peer.theirNicknameForMe ? (
                  <span className="hidden sm:inline text-muted text-[11px] truncate">
                    • Calls you "{activeConversation.peer.theirNicknameForMe}"
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <AppLogo size={32} className="rounded-[8px]" />
            <div>
              <p className="text-sm font-semibold text-foreground/90">Select a conversation</p>
              {otherPendingCount > 0 ? (
                <p className="text-[11px] font-medium text-accent">
                  {otherPendingCount} pending message{otherPendingCount > 1 ? "s" : ""}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Right side controls */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Desktop Controls (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-1">
          <WallpaperPicker />
          <ThemePresetPicker />
          <ThemeToggle />

          <Button
            variant="ghost"
            isIconOnly
            className="size-9"
            aria-pressed={isSoundEnabled}
            onPress={() => setSoundEnabled(!isSoundEnabled)}
          >
            {isSoundEnabled ? (
              <Volume2Icon className="size-4.5" strokeWidth={2} />
            ) : (
              <VolumeXIcon className="size-4.5" strokeWidth={2} />
            )}
          </Button>

          {needRefresh ? (
            <Button
              variant="primary"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs font-semibold animate-pulse"
              onPress={updateApp}
            >
              <ArrowUpCircleIcon className="size-3.5" />
              Update
            </Button>
          ) : (
            <Button
              variant="ghost"
              isIconOnly
              className="size-9"
              aria-label="Check for updates"
              title="Check for updates"
              isDisabled={isChecking}
              onPress={() => checkForUpdate(true)}
            >
              <RefreshCwIcon className={`size-4 ${isChecking ? "animate-spin text-accent" : ""}`} />
            </Button>
          )}

          {activeConversation ? (
            <Button
              variant="ghost"
              isIconOnly
              className="size-9"
              aria-label="Close chat"
              onPress={() => setActiveConversationId(null)}
            >
              <XIcon className="size-4.5" strokeWidth={2} />
            </Button>
          ) : null}
        </div>

        {/* Mobile Controls: clean & spacious */}
        <div className="flex md:hidden items-center gap-1">
          {activeConversation ? (
            <button
              type="button"
              onClick={() => setShowNicknameModal(true)}
              className="flex size-9 items-center justify-center rounded-full text-accent hover:bg-accent/10 active:scale-95 transition"
              aria-label="Nicknames"
            >
              <SparklesIcon className="size-4.5" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setShowMobileOptions(!showMobileOptions)}
            className="relative flex size-9 items-center justify-center rounded-full text-foreground/80 hover:bg-surface active:scale-95 transition"
            aria-label="More options"
          >
            <MoreVerticalIcon className="size-5" />
            {needRefresh ? (
              <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-accent animate-ping" />
            ) : null}
          </button>
        </div>
      </div>

      {/* Mobile Options Dropdown Sheet */}
      {showMobileOptions ? (
        <div className="absolute right-3 top-14 z-50 w-56 rounded-2xl border border-border bg-background/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 md:hidden">
          <div className="space-y-1">
            <button
              onClick={() => {
                setShowMobileOptions(false);
                if (needRefresh) {
                  updateApp();
                } else {
                  checkForUpdate(true);
                }
              }}
              disabled={isChecking}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-surface transition"
            >
              <span className="flex items-center gap-2">
                <RefreshCwIcon className={`size-4 ${isChecking ? "animate-spin text-accent" : needRefresh ? "text-accent" : ""}`} />
                {needRefresh ? "Update App Now" : "Check for Updates"}
              </span>
              {needRefresh ? (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground animate-pulse">
                  New
                </span>
              ) : (
                <span className="text-[10px] text-muted">PWA</span>
              )}
            </button>
            <button
              onClick={() => {
                setTheme(theme === "dark" ? "light" : "dark");
                setShowMobileOptions(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-surface transition"
            >
              <span className="flex items-center gap-2">
                {theme === "dark" ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </span>
              <span className="text-[10px] text-muted capitalize">{theme}</span>
            </button>

            <button
              onClick={() => {
                setSoundEnabled(!isSoundEnabled);
                setShowMobileOptions(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-surface transition"
            >
              <span className="flex items-center gap-2">
                {isSoundEnabled ? <Volume2Icon className="size-4" /> : <VolumeXIcon className="size-4" />}
                Message Sound
              </span>
              <span className="text-[10px] text-muted">{isSoundEnabled ? "On" : "Muted"}</span>
            </button>

            {activeConversation ? (
              <button
                onClick={() => {
                  setShowNicknameModal(true);
                  setShowMobileOptions(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-accent hover:bg-accent/10 transition"
              >
                <SparklesIcon className="size-4" />
                Chat Nicknames
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Backdrop to close mobile dropdown */}
      {showMobileOptions ? (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setShowMobileOptions(false)}
        />
      ) : null}

      {/* Nicknames modal */}
      {activeConversation ? (
        <NicknameDetailsModal
          isOpen={showNicknameModal}
          onClose={() => setShowNicknameModal(false)}
          peer={activeConversation.peer}
        />
      ) : null}
    </header>
  );
}
