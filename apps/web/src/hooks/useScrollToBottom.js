import { useEffect, useRef } from "react";

/**
 * Scrolls a container to the bottom when `threadKey`, `lastItemId`, or `isTyping` changes,
 * or when the mobile virtual keyboard opens/closes.
 */
function useScrollToBottom(threadKey, lastItemId, isTyping) {
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
    const timeout = setTimeout(scrollToBottom, 60);

    return () => clearTimeout(timeout);
  }, [threadKey, lastItemId, isTyping]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleViewportChange = () => {
      const el = scrollRef.current;
      if (!el) return;
      // When keyboard opens or viewport shrinks, keep user pinned to latest messages & typing
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 50);
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    };

    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);

    return () => {
      window.visualViewport.removeEventListener("resize", handleViewportChange);
      window.visualViewport.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  return scrollRef;
}

export default useScrollToBottom;
