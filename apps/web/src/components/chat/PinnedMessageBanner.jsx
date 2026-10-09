import { useState } from "react";
import { Pin, X, ChevronRight, ChevronLeft, Image, Mic, Film } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { AppleEmojiText } from "../common/AppleEmoji";

export function PinnedMessageBanner() {
  const pinnedMessages = useChatStore((state) => state.pinnedMessages);
  const togglePinMessage = useChatStore((state) => state.togglePinMessage);
  const highlightMessage = useChatStore((state) => state.highlightMessage);
  const authUser = useAuthStore((state) => state.authUser);
  const myId = authUser?._id ? String(authUser._id) : "";

  const { activeConversation } = useSelectedConversation();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  // Clamp index within range if pinnedMessages count changes
  const activeIndex = currentIndex >= pinnedMessages.length ? 0 : currentIndex;
  const pinned = pinnedMessages[activeIndex];
  if (!pinned) return null;

  const isMine = String(pinned.senderId) === myId;
  const peerName = activeConversation?.peer?.nickname || activeConversation?.peer?.name || "Friend";
  const authorName = isMine ? "You" : peerName;

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + pinnedMessages.length) % pinnedMessages.length);
  };

  const handleBannerClick = () => {
    highlightMessage(pinned._id);
  };

  const handleUnpin = (e) => {
    e.stopPropagation();
    togglePinMessage(pinned._id);
  };

  return (
    <div
      onClick={handleBannerClick}
      className="group relative z-10 flex cursor-pointer items-center justify-between gap-2 border-b border-border/70 bg-surface/75 px-3 py-1.5 backdrop-blur-xl transition-colors hover:bg-surface active:bg-surface-elevated select-none"
      title="Click to jump to pinned message"
    >
      {/* Left side: Pin icon & author / preview */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Pin className="size-3.5 fill-accent" />
        </div>

        <div className="min-w-0 flex-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground/90 truncate">
              {authorName}
            </span>
            {pinnedMessages.length > 1 ? (
              <span className="rounded-full bg-border/60 px-1.5 py-px text-[10px] tabular-nums font-medium text-muted">
                {activeIndex + 1}/{pinnedMessages.length}
              </span>
            ) : null}
          </div>

          <p className="truncate text-muted text-[11px] leading-tight">
            {pinned.text ? (
              <AppleEmojiText text={pinned.text} disableBigEmoji />
            ) : pinned.image ? (
              <span className="flex items-center gap-1">
                <Image className="size-3" /> Photo
              </span>
            ) : pinned.video ? (
              <span className="flex items-center gap-1">
                <Film className="size-3" /> Video
              </span>
            ) : pinned.audio ? (
              <span className="flex items-center gap-1">
                <Mic className="size-3" /> Voice message
              </span>
            ) : (
              "Pinned message"
            )}
          </p>
        </div>
      </div>

      {/* Right side: Carousel controls (if > 1) & unpin button */}
      <div className="flex shrink-0 items-center gap-1">
        {pinnedMessages.length > 1 ? (
          <div className="flex items-center">
            <button
              type="button"
              onClick={handlePrev}
              className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-border/60 hover:text-foreground active:scale-95 transition"
              title="Previous pinned message"
              aria-label="Previous pinned message"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-border/60 hover:text-foreground active:scale-95 transition"
              title="Next pinned message"
              aria-label="Next pinned message"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleUnpin}
          className="flex size-6 items-center justify-center rounded-full text-muted/70 hover:bg-danger/10 hover:text-danger active:scale-95 transition"
          title="Unpin message"
          aria-label="Unpin message"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
