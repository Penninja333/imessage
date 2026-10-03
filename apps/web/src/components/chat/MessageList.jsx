import { useEffect, useRef, useState } from "react";
import useScrollToBottom from "../../hooks/useScrollToBottom";
import { MessageBubble } from "./MessageBubble";
import { NoConversationPlaceholder } from "./NoConversationPlaceholder";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { useChatStore } from "../../store/useChatStore";

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

export function MessageList() {
  const { activeConversation, activeConversationId } = useSelectedConversation();
  const typingUser = useChatStore((state) => state.typingUser);

  const [visibleCount, setVisibleCount] = useState(80);

  // Reset windowing limit when switching conversations
  useEffect(() => {
    setVisibleCount(80);
  }, [activeConversationId]);

  const isPartnerTyping =
    Boolean(typingUser && String(typingUser) === String(activeConversationId));

  const lastMessageId = activeConversation?.messages.at(-1)?.id;
  const messagesScrollRef = useScrollToBottom(
    activeConversationId,
    lastMessageId,
    isPartnerTyping
  );
  const bottomAnchorRef = useRef(null);

  // When typing state changes, scroll into view smoothly
  useEffect(() => {
    if (isPartnerTyping && bottomAnchorRef.current) {
      const scrollEl = messagesScrollRef.current;
      if (scrollEl) {
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
      bottomAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isPartnerTyping, messagesScrollRef]);

  const allMessages = activeConversation?.messages || [];
  const hasOlderMessages = allMessages.length > visibleCount;
  const messages = hasOlderMessages ? allMessages.slice(-visibleCount) : allMessages;
  const hiddenCount = allMessages.length - visibleCount;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 60);
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
      {activeConversation ? (
        <div
          ref={messagesScrollRef}
          className="flex flex-1 flex-col overflow-y-auto overscroll-contain px-2.5 pt-3 pb-6 sm:px-4 sm:pt-4 sm:pb-8"
        >
          {hasOlderMessages ? (
            <div className="my-2.5 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                className="flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-3.5 py-1 text-xs font-semibold text-muted hover:bg-surface hover:text-foreground active:scale-95 transition shadow-xs"
              >
                <span>↑ Load earlier messages ({hiddenCount} older)</span>
              </button>
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-muted">
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs text-muted/70 mt-1">Send a message to start the conversation</p>
            </div>
          ) : null}

          {messages.map((message, index) => {
            const prevMessage = messages[index - 1];

            // Date separator check
            const currentDateLabel = formatDateSeparator(message.createdAt);
            const prevDateLabel = prevMessage ? formatDateSeparator(prevMessage.createdAt) : null;
            const showDateHeader = currentDateLabel !== prevDateLabel;

            // Grouping: consecutive messages within 2 minutes from same sender
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

            // Only show timestamp if it is the last message in a cluster
            const showTime = !(isNextSameSender && isNextCloseInTime);

            return (
              <div
                key={message.id || index}
                className="flex flex-col"
                style={{
                  contentVisibility: "auto",
                  containIntrinsicSize: "0 60px",
                }}
              >
                {showDateHeader ? (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-surface/80 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-muted shadow-xs">
                      {currentDateLabel}
                    </span>
                  </div>
                ) : null}

                <MessageBubble message={message} showTime={showTime} />
              </div>
            );
          })}

          {/* Apple-style Animated Typing Bubble in Chat Feed */}
          {isPartnerTyping ? (
            <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-200 mt-2 mb-2">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border/50 bg-surface px-4 py-3 shadow-xs">
                <span className="size-2 rounded-full bg-accent animate-bounce [animation-delay:-0.32s]" />
                <span className="size-2 rounded-full bg-accent animate-bounce [animation-delay:-0.16s]" />
                <span className="size-2 rounded-full bg-accent animate-bounce" />
              </div>
            </div>
          ) : null}

          {/* Bottom Anchor to ensure clean scroll clearance above composer */}
          <div ref={bottomAnchorRef} className="h-2 shrink-0 pointer-events-none" />
        </div>
      ) : (
        <NoConversationPlaceholder />
      )}
    </div>
  );
}
