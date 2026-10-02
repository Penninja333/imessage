import { useWallpaper } from "../context/wallpaper";
import { useChatStore } from "../store/useChatStore";
import { useSelectedConversation } from "../hooks/useSelectedConversation";
import { useVisualViewport } from "../hooks/useVisualViewport";
import { useEffect } from "react";
import ChatSidebar from "../components/chat/ChatSidebar";
import { ChatHeader } from "../components/chat/ChatHeader";
import { MessageList } from "../components/chat/MessageList";
import { ChatComposer } from "../components/chat/ChatComposer";

function ChatPage() {
  const { frameStyle } = useWallpaper();
  const viewportHeight = useVisualViewport();

  const getConversations = useChatStore((state) => state.getConversations);
  const getMessages = useChatStore((state) => state.getMessages);
  const getUsers = useChatStore((state) => state.getUsers);

  const { activeConversation, activeConversationId, isLargeScreen } = useSelectedConversation();

  useEffect(() => {
    getUsers();
    getConversations();
  }, [getConversations, getUsers]);

  useEffect(() => {
    if (!activeConversationId) return;
    getMessages(activeConversationId);
  }, [getMessages, activeConversationId]);

  const heightStyle =
    !isLargeScreen && viewportHeight
      ? { height: `${viewportHeight}px`, maxHeight: `${viewportHeight}px` }
      : { height: "100dvh" };

  return (
    <div
      className="fixed inset-0 flex w-full flex-col overflow-hidden p-0 md:relative md:h-dvh md:p-6 lg:p-8"
      style={{
        ...frameStyle,
        ...heightStyle,
        overscrollBehavior: "none",
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-6xl flex-1 overflow-hidden rounded-none border-0 bg-background text-foreground shadow-2xl md:rounded-2xl md:border md:border-border">
        <ChatSidebar />

        <div
          className={`flex-1 flex-col overflow-hidden h-full ${
            !isLargeScreen && !activeConversationId ? "hidden lg:flex" : "flex"
          }`}
        >
          <ChatHeader />
          <MessageList />

          {activeConversation ? <ChatComposer /> : null}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
