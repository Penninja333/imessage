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

    const handleViewportResize = () => {
      const el = scrollRef.current;
      if (!el) return;

      // Only auto-scroll to bottom if user is already near bottom (within 200px)
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < 200) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    };

    window.visualViewport.addEventListener("resize", handleViewportResize, { passive: true });

    return () => {
      window.visualViewport.removeEventListener("resize", handleViewportResize);
    };
  }, []);

  return scrollRef;
}

export default useScrollToBottom;
