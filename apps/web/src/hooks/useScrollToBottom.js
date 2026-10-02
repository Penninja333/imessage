import { useEffect, useRef } from "react";

/**
 * Scrolls a container to the bottom when `threadKey` or `lastItemId` changes,
 * or when the mobile virtual keyboard opens/closes.
 */
function useScrollToBottom(threadKey, lastItemId) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (threadKey == null || threadKey === "") return;
    const el = scrollRef.current;
    if (!el) return;

    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight;
    };

    scrollToBottom();
    requestAnimationFrame(scrollToBottom);
  }, [threadKey, lastItemId]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleViewportChange = () => {
      const el = scrollRef.current;
      if (!el) return;
      // When keyboard opens or viewport shrinks, keep user pinned to latest messages
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 50);
    };

    window.visualViewport.addEventListener("resize", handleViewportChange);

    return () => {
      window.visualViewport.removeEventListener("resize", handleViewportChange);
    };
  }, []);

  return scrollRef;
}

export default useScrollToBottom;
