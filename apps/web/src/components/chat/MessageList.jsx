import { useEffect, useRef, useState, useCallback } from "react";
import useScrollToBottom from "../../hooks/useScrollToBottom";
import { MessageBubble } from "./MessageBubble";
import { NoConversationPlaceholder } from "./NoConversationPlaceholder";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { useChatStore } from "../../store/useChatStore";
import { useChatTheme } from "../../hooks/useChatTheme";

const INITIAL_WINDOW = 30; // messages rendered on first open
const LOAD_MORE_STEP = 40; // how many more to prepend on scroll-up

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
function MessageSkeleton({ isRight }) {
  return (
    <div className={`flex w-full ${isRight ? "justify-end" : "justify-start"} my-1`}>
      <div
        className={`h-9 animate-pulse rounded-2xl bg-surface/70 ${isRight ? "rounded-br-sm" : "rounded-bl-sm"}`}
        style={{ width: `${120 + Math.random() * 80}px` }}
      />
    </div>
  );
}

export function MessageList() {
  const { activeConversation, activeConversationId } = useSelectedConversation();
  const typingUser = useChatStore((state) => state.typingUser);
  const isMessagesLoading = useChatStore((state) => state.isMessagesLoading);
  const { theme, resolvedBgStyle } = useChatTheme(activeConversationId);

  const [visibleCount, setVisibleCount] = useState(INITIAL_WINDOW);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null); // top sentinel for IntersectionObserver
  const bottomAnchorRef = useRef(null);
  const isLoadingMoreRef = useRef(false); // prevent double-trigger

  const isPartnerTyping =
    Boolean(typingUser && String(typingUser) === String(activeConversationId));

  const allMessages = activeConversation?.messages || [];
  const hasOlderMessages = allMessages.length > visibleCount;
  const messages = hasOlderMessages ? allMessages.slice(-visibleCount) : allMessages;
  const hiddenCount = allMessages.length - visibleCount;

  // Reset window when switching conversations
  useEffect(() => {
    setVisibleCount(INITIAL_WINDOW);
    isLoadingMoreRef.current = false;
  }, [activeConversationId]);

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

  // Load more when user scrolls to the top sentinel
  const handleLoadMore = useCallback(() => {
    if (!hasOlderMessages || isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;

    const el = messagesScrollRef.current;
    // Capture the current scroll height BEFORE adding more messages
    const prevScrollHeight = el ? el.scrollHeight : 0;
    const prevScrollTop = el ? el.scrollTop : 0;

    setVisibleCount((prev) => prev + LOAD_MORE_STEP);

    // After React re-renders with more messages, restore scroll position
    requestAnimationFrame(() => {
      if (el) {
        const newScrollHeight = el.scrollHeight;
        const diff = newScrollHeight - prevScrollHeight;
        el.scrollTop = prevScrollTop + diff;
      }
      // Small debounce before allowing next trigger
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 300);
    });
  }, [hasOlderMessages, messagesScrollRef]);

  // IntersectionObserver on the top sentinel — fires when user scrolls near top
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
        rootMargin: "120px 0px 0px 0px", // trigger 120px before the sentinel actually hits viewport top
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore, messagesScrollRef, activeConversationId]);

  return (
    <div
      className="relative flex flex-1 flex-col overflow-hidden bg-background transition-colors duration-300"
      style={resolvedBgStyle || undefined}
    >
      {activeConversation ? (
        <div
          ref={messagesScrollRef}
          className="flex flex-1 flex-col overflow-y-auto overscroll-contain px-2.5 pt-3 pb-6 sm:px-4 sm:pt-4 sm:pb-8 transition-all duration-300"
          style={{ overflowAnchor: "none", ...(resolvedBgStyle || {}) }}
        >
          {/* Top sentinel element — invisible, watched by IntersectionObserver */}
          <div ref={sentinelRef} className="shrink-0 pointer-events-none" style={{ height: "1px" }} />

          {/* Loading older messages indicator */}
          {hasOlderMessages ? (
            <div className="my-2 flex justify-center">
              <span className="rounded-full bg-surface/60 px-3 py-0.5 text-[11px] text-muted animate-pulse">
                {hiddenCount} older message{hiddenCount !== 1 ? "s" : ""} — scroll up to load
              </span>
            </div>
          ) : null}

          {/* Loading skeleton — shown while fetching from server */}
          {isMessagesLoading ? (
            <div className="flex flex-col gap-1 px-1 py-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <MessageSkeleton key={i} isRight={i % 3 === 0} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-muted">
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs text-muted/70 mt-1">Send a message to start the conversation</p>
            </div>
          ) : null}

          {messages.map((message, index) => {
            const prevMessage = messages[index - 1];

            // Date separator
            const currentDateLabel = formatDateSeparator(message.createdAt);
            const prevDateLabel = prevMessage ? formatDateSeparator(prevMessage.createdAt) : null;
            const showDateHeader = currentDateLabel !== prevDateLabel;

            // Cluster grouping — consecutive same-sender messages within 2 min
            const isSameSender = prevMessage && prevMessage.role === message.role;
            const isCloseInTime =
              prevMessage &&
              message.createdAt &&
              prevMessage.createdAt &&
              Math.abs(new Date(message.createdAt) - new Date(prevMessage.createdAt)) < 120000;

            const nextMessage = messages[index + 1];
            const isNextSameSender = nextMessage && nextMessage.role === message.role;
            const isNextCloseInTime =
              nextMessage &&
              nextMessage.createdAt &&
              message.createdAt &&
              Math.abs(new Date(nextMessage.createdAt) - new Date(message.createdAt)) < 120000;

            // Only show timestamp at the end of a cluster
            const showTime = !(isNextSameSender && isNextCloseInTime);

            return (
              <div key={message.id || index} className="flex flex-col">
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

          {/* Bottom anchor — scroll-anchoring target */}
          <div
            ref={bottomAnchorRef}
            className="h-2 shrink-0 pointer-events-none"
            style={{ overflowAnchor: "auto" }}
          />
        </div>
      ) : (
        <NoConversationPlaceholder />
      )}
    </div>
  );
}
