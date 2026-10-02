import useScrollToBottom from "../../hooks/useScrollToBottom";
import { MessageBubble } from "./MessageBubble";
import { NoConversationPlaceholder } from "./NoConversationPlaceholder";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { useChatStore } from "../../store/useChatStore";

export function MessageList() {
  const { activeConversation, activeConversationId } = useSelectedConversation();
  const typingUser = useChatStore((state) => state.typingUser);

  const isPartnerTyping =
    typingUser && String(typingUser) === String(activeConversationId);

  const lastMessageId = activeConversation?.messages.at(-1)?.id;
  const messagesScrollRef = useScrollToBottom(activeConversationId, lastMessageId);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {activeConversation ? (
        <div
          ref={messagesScrollRef}
          className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3 sm:py-4"
        >
          <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
            Today
          </p>
          {activeConversation.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isPartnerTyping ? (
            <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-surface px-4 py-2.5 shadow-sm">
                <span className="size-2 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                <span className="size-2 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                <span className="size-2 rounded-full bg-accent animate-bounce" />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <NoConversationPlaceholder />
      )}
    </div>
  );
}
