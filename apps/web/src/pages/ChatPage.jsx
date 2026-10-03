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
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);

  const { activeConversation, activeConversationId, isLargeScreen } = useSelectedConversation();

  useEffect(() => {
    getUsers();
    getConversations();
  }, [getConversations, getUsers]);

  useEffect(() => {
    if (!activeConversationId) return;
    getMessages(activeConversationId);
  }, [getMessages, activeConversationId]);

  // ─── Back-button / back-gesture interception ───────────────────────────────
  // On mobile PWA, the OS back button fires a browser "popstate" event.
  // Without this, history is empty and the app exits to the home screen.
  // Strategy:
  //   • When a conversation opens → push a dummy "#chat" history entry so there
  //     is always something to "go back to" inside the app.
  //   • When popstate fires → if a conversation is open, close it (go to sidebar)
  //     and immediately push another dummy entry to keep the stack non-empty.
  //   • When no conversation is open → let the browser do its thing (nothing to intercept).
  useEffect(() => {
    if (!activeConversationId) return; // only intercept when inside a chat

    // Push the dummy entry so the back button has a target inside the app
    window.history.pushState({ chat: activeConversationId }, "");

    const handlePopState = () => {
      const currentId = useChatStore.getState().activeConversationId;
      if (currentId) {
        // Close the conversation → go back to sidebar
        setActiveConversationId(null);
        // Push another dummy entry so the NEXT back press is also intercepted
        // (prevents the app from exiting if the user presses back again quickly)
        window.history.pushState({ chat: null }, "");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeConversationId, setActiveConversationId]);
  // ───────────────────────────────────────────────────────────────────────────

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

