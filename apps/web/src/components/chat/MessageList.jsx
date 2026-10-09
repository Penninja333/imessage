import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import useScrollToBottom from "../../hooks/useScrollToBottom";
import { MessageBubble } from "./MessageBubble";
import { NoConversationPlaceholder } from "./NoConversationPlaceholder";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { useChatStore } from "../../store/useChatStore";
import { useChatTheme } from "../../hooks/useChatTheme";
import { useWallpaper } from "../../context/wallpaper";
import { ChevronDownIcon, LoaderIcon } from "lucide-react";

function formatDateSeparator(dateStr) {
  if (!dateStr) return "Today";
  const date = new Date(dateStr);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Thin skeleton bar for loading placeholders
function MessageSkeleton({ isRight, index = 0 }) {
  return (
    <div className={`flex w-full ${isRight ? "justify-end" : "justify-start"} my-1`}>
      <div
        className={`h-9 animate-pulse rounded-2xl bg-surface/70 ${isRight ? "rounded-br-sm" : "rounded-bl-sm"}`}
        style={{ width: `${120 + ((index * 37) % 80)}px` }}
      />
    </div>
  );
}

export function MessageList() {
  const { activeConversation, activeConversationId } = useSelectedConversation();
  const typingUser = useChatStore((state) => state.typingUser);
  const isMessagesLoading = useChatStore((state) => state.isMessagesLoading);
  const isLoadingMoreMessages = useChatStore((state) => state.isLoadingMoreMessages);
  const hasMoreMessages = useChatStore((state) => state.hasMoreMessages);
  const activeMatchId = useChatStore((state) => state.activeMatchId);
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);
  const { theme, resolvedBgStyle } = useChatTheme(activeConversationId);
  const { frameStyle, wallpaper } = useWallpaper();

  // If a custom chat theme is active (solid preset), use its resolvedBgStyle.
  // Otherwise, fallback to the user's selected wallpaper backdrop.
  const isCustomTheme = Boolean(resolvedBgStyle);
  const containerBgStyle = isCustomTheme ? resolvedBgStyle : frameStyle;

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null); // top sentinel for loading more
  const bottomAnchorRef = useRef(null);
  const isLoadingMoreRef = useRef(false);

  // Unread jump button
  const [prevConvId, setPrevConvId] = useState(activeConversationId);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
  const bottomSentinelRef = useRef(null); // watch if bottom is visible

  // Reset when switching conversations
  if (activeConversationId !== prevConvId) {
    setPrevConvId(activeConversationId);
    setShowJumpButton(false);
    setUnreadBelowCount(0);
  }

  useEffect(() => {
    isLoadingMoreRef.current = false;
  }, [activeConversationId]);

  const isPartnerTyping =
    Boolean(typingUser && String(typingUser) === String(activeConversationId));

  const rawMessages = activeConversation?.messages;
  const allMessages = useMemo(() => rawMessages || [], [rawMessages]);

  // Scroll to bottom on first load and when new messages arrive
  const lastMessageId = allMessages.at(-1)?.id;
  const messagesScrollRef = useScrollToBottom(activeConversationId, lastMessageId, isPartnerTyping);

  // Keep the same scroll ref for both scrollToBottom and our local use
  useEffect(() => {
    scrollRef.current = messagesScrollRef.current;
  });

  // Scroll to bottom when partner types
  useEffect(() => {
    if (isPartnerTyping && bottomAnchorRef.current) {
      const el = messagesScrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      bottomAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isPartnerTyping, messagesScrollRef]);

  // Jump to and focus active search match
  useEffect(() => {
    if (!activeMatchId) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(`msg-${activeMatchId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 70);

    return () => clearTimeout(timer);
  }, [activeMatchId]);

  // Load more (server-side pagination) when user scrolls near the top sentinel
  const handleLoadMore = useCallback(() => {
    if (!hasMoreMessages || isLoadingMoreRef.current || isLoadingMoreMessages) return;
    isLoadingMoreRef.current = true;

    const el = messagesScrollRef.current;
    const prevScrollHeight = el ? el.scrollHeight : 0;
    const prevScrollTop = el ? el.scrollTop : 0;

    loadMoreMessages(activeConversationId).then(() => {
      requestAnimationFrame(() => {
        if (el) {
          const newScrollHeight = el.scrollHeight;
          const diff = newScrollHeight - prevScrollHeight;
          el.scrollTop = prevScrollTop + diff;
        }
        setTimeout(() => {
          isLoadingMoreRef.current = false;
        }, 300);
      });
    });
  }, [hasMoreMessages, isLoadingMoreMessages, loadMoreMessages, activeConversationId, messagesScrollRef]);

  // IntersectionObserver on the top sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        root: messagesScrollRef.current,
        rootMargin: "120px 0px 0px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore, messagesScrollRef, activeConversationId]);

  // Unread jump button: watch bottom sentinel visibility
  useEffect(() => {
    const el = bottomSentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isBottomVisible = Boolean(entries[0]?.isIntersecting);
        setShowJumpButton(!isBottomVisible);
        if (isBottomVisible) {
          setUnreadBelowCount(0);
        }
      },
      { root: messagesScrollRef.current, threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [messagesScrollRef, activeConversationId]);

  // Count unread messages below the visible fold asynchronously
  useEffect(() => {
    if (!showJumpButton) return;
    const rafId = requestAnimationFrame(() => {
      const scrollEl = messagesScrollRef.current;
      if (!scrollEl) return;
      let count = 0;
      const items = scrollEl.querySelectorAll("[data-unread]");
      for (const item of items) {
        const rect = item.getBoundingClientRect();
        const parentRect = scrollEl.getBoundingClientRect();
        if (rect.top > parentRect.bottom) count++;
      }
      setUnreadBelowCount(count);
    });
    return () => cancelAnimationFrame(rafId);
  }, [showJumpButton, allMessages, messagesScrollRef]);

  const handleJumpToBottom = () => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  return (
    <div
      className="message-list-container relative flex flex-1 flex-col overflow-hidden bg-background transition-colors duration-300"
      style={containerBgStyle || undefined}
    >
      {/* Contrast Scrim Overlay for Wallpaper Readability:
          When using a wallpaper (default theme), apply an Apple-style frosted scrim
          so message text, timestamps, and media cards remain 100% legible across any photo.
          When a solid custom theme is selected, the solid theme tone is rendered directly. */}
      {!isCustomTheme && wallpaper?.url ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-background/65 dark:bg-background/80 backdrop-blur-[0.5px] transition-colors duration-300"
          aria-hidden="true"
        />
      ) : null}

      {activeConversation ? (
        <div
          ref={messagesScrollRef}
          className="relative z-10 flex flex-1 flex-col overflow-y-auto overscroll-contain px-2.5 pt-3 pb-6 sm:px-4 sm:pt-4 sm:pb-8 transition-all duration-300"
          style={{ overflowAnchor: "none" }}
        >
          {/* Top sentinel element — invisible, watched by IntersectionObserver */}
          <div ref={sentinelRef} className="shrink-0 pointer-events-none" style={{ height: "1px" }} />

          {/* Loading older messages indicator */}
          {isLoadingMoreMessages ? (
            <div className="my-2 flex justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-surface/60 px-3 py-0.5 text-[11px] text-muted">
                <LoaderIcon className="size-3 animate-spin" />
                Loading older messages…
              </span>
            </div>
          ) : hasMoreMessages ? (
            <div className="my-2 flex justify-center">
              <span className="rounded-full bg-surface/60 px-3 py-0.5 text-[11px] text-muted animate-pulse">
                Scroll up to load more
              </span>
            </div>
          ) : null}

          {/* Loading skeleton — shown while fetching from server */}
          {isMessagesLoading ? (
            <div className="flex flex-col gap-1 px-1 py-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <MessageSkeleton key={i} isRight={i % 3 === 0} index={i} />
              ))}
            </div>
          ) : allMessages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-muted">
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs text-muted/70 mt-1">Send a message to start the conversation</p>
            </div>
          ) : null}

          {allMessages.map((message, index) => {
            const prevMessage = allMessages[index - 1];

            // Date separator
            const currentDateLabel = formatDateSeparator(message.createdAt);
            const prevDateLabel = prevMessage ? formatDateSeparator(prevMessage.createdAt) : null;
            const showDateHeader = currentDateLabel !== prevDateLabel;

            const nextMessage = allMessages[index + 1];
            const isNextSameSender = nextMessage && nextMessage.role === message.role;
            const isNextCloseInTime =
              nextMessage &&
              nextMessage.createdAt &&
              message.createdAt &&
              Math.abs(new Date(nextMessage.createdAt) - new Date(message.createdAt)) < 120000;

            // Only show timestamp at the end of a cluster
            const showTime = !(isNextSameSender && isNextCloseInTime);
            const isMatch = Boolean(activeMatchId && String(message.id) === String(activeMatchId));
            const isUnread = message.role === "them" && !message.seen;

            return (
              <div
                key={message.id || index}
                id={`msg-${message.id}`}
                data-unread={isUnread ? "true" : undefined}
                className={`flex flex-col transition-all duration-300 rounded-2xl ${
                  isMatch
                    ? "ring-2 ring-accent/80 bg-accent/15 scale-[1.01] p-1.5 -m-1.5 shadow-md"
                    : ""
                }`}
              >
                {showDateHeader ? (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-surface/80 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-muted shadow-xs">
                      {currentDateLabel}
                    </span>
                  </div>
                ) : null}
                <MessageBubble
                  message={message}
                  showTime={showTime}
                  bubbleColor={theme.bubbleColor}
                  bubbleTextColor={theme.bubbleText}
                />
              </div>
            );
          })}

          {/* Apple-style Animated Typing Bubble */}
          {isPartnerTyping ? (
            <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-200 mt-2 mb-2">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border/50 bg-surface px-4 py-3 shadow-xs">
                <span className="size-2 rounded-full bg-accent animate-bounce [animation-delay:-0.32s]" />
                <span className="size-2 rounded-full bg-accent animate-bounce [animation-delay:-0.16s]" />
                <span className="size-2 rounded-full bg-accent animate-bounce" />
              </div>
            </div>
          ) : null}

          {/* Bottom sentinel for unread-jump visibility tracking */}
          <div ref={bottomSentinelRef} className="h-1 shrink-0 pointer-events-none" />

          {/* Bottom anchor — scroll-anchoring target */}
          <div
            ref={bottomAnchorRef}
            className="h-2 shrink-0 pointer-events-none"
            style={{ overflowAnchor: "auto" }}
          />
        </div>
      ) : (
        <div className="relative z-10 flex min-h-full flex-1 flex-col items-center justify-center">
          <NoConversationPlaceholder />
        </div>
      )}

      {/* ↓ Unread Jump Button */}
      {showJumpButton && activeConversation ? (
        <button
          type="button"
          onClick={handleJumpToBottom}
          className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground shadow-lg hover:brightness-110 active:scale-95 transition-all animate-in slide-in-from-bottom-2 duration-200"
          aria-label="Jump to latest messages"
        >
          <ChevronDownIcon className="size-3.5" strokeWidth={2.5} />
          {unreadBelowCount > 0 ? `${unreadBelowCount} new` : "Latest"}
        </button>
      ) : null}
    </div>
  );
}
