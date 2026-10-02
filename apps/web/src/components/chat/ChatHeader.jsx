import { Avatar, Button } from "@heroui/react";
import { ChevronLeftIcon, PencilIcon, Volume2Icon, VolumeXIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { AppLogo } from "../AppLogo";
import { AvatarWithOnlineIndicator } from "./AvatarWithOnlineIndicator";

import { ThemePresetPicker } from "../ThemePresetPicker";

import { ThemeToggle } from "../ThemeToggle";
import { WallpaperPicker } from "../WallpaperPicker";

import { useChatStore } from "../../store/useChatStore";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";

export function ChatHeader() {
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const setSoundEnabled = useChatStore((state) => state.setSoundEnabled);
  const setNickname = useChatStore((state) => state.setNickname);

  const { activeConversation, isLargeScreen } = useSelectedConversation();
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");

  const handleSaveNickname = async () => {
    const targetId = activeConversation?.id;
    if (targetId) {
      await setNickname(targetId, nicknameInput.trim());
    }
    setEditingNickname(false);
  };

  const startEditing = () => {
    setNicknameInput(activeConversation?.peer?.nickname || "");
    setEditingNickname(true);
  };

  return (
    <header className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-1.5 py-1.5 sm:gap-2 sm:px-2 sm:py-2">
      {activeConversation && !isLargeScreen ? (
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className="shrink-0"
          onPress={() => setActiveConversationId(null)}
        >
          <ChevronLeftIcon className="size-6" strokeWidth={2.25} />
        </Button>
      ) : null}

      {activeConversation ? (
        <>
          <AvatarWithOnlineIndicator isOnline={activeConversation.peer.isOnline ?? true}>
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

          <div className="flex-1 text-center sm:text-left">
            {editingNickname ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={nicknameInput}
                  maxLength={32}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveNickname();
                    if (e.key === "Escape") setEditingNickname(false);
                  }}
                  placeholder="Set nickname..."
                  className="w-full rounded-lg border border-border bg-background px-2 py-1 text-[15px] font-semibold text-foreground outline-none focus:border-accent"
                />
                <Button variant="ghost" size="sm" isIconOnly className="shrink-0 size-7" onPress={handleSaveNickname}>
                  <PencilIcon className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <p className="truncate text-[15px] font-semibold leading-tight">
                  {activeConversation.peer.name}
                </p>
                {activeConversation.peer.nickname ? (
                  <span className="text-[10px] text-accent/70">↩ {activeConversation.peer.fullName}</span>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  className="shrink-0 size-6 text-muted"
                  onPress={startEditing}
                >
                  <PencilIcon className="size-3" strokeWidth={2} aria-label="Edit nickname" />
                </Button>
              </div>
            )}
            <p className="truncate text-xs text-muted">
              {activeConversation.peer.isOnline ? (
                <span className="font-medium text-success">Online</span>
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center gap-2.5 sm:text-left">
          <AppLogo size={36} className="rounded-[9px]" />
          <div className="flex-1 text-center sm:text-left">
            <p className="truncate text-[13px] font-medium text-muted">Select a conversation</p>
          </div>
        </div>
      )}

      <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-0.5 sm:gap-1">
        <div className="hidden min-[400px]:contents">
          <WallpaperPicker />
          <ThemePresetPicker />
        </div>

        <ThemeToggle />

        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className="shrink-0"
          aria-pressed={isSoundEnabled}
          onPress={() => setSoundEnabled(!isSoundEnabled)}
        >
          {isSoundEnabled ? (
            <Volume2Icon className="size-5.5" strokeWidth={2} aria-hidden />
          ) : (
            <VolumeXIcon className="size-5.5" strokeWidth={2} aria-hidden />
          )}
        </Button>

        {activeConversation ? (
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            className="shrink-0"
            aria-label="Close chat"
            onPress={() => setActiveConversationId(null)}
          >
            <XIcon className="size-5.5" strokeWidth={2} aria-hidden />
          </Button>
        ) : null}
      </div>
    </header>
  );
}
