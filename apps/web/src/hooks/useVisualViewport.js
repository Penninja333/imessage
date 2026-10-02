import { useState, useEffect } from "react";

/**
 * Hook to track visual viewport height on mobile devices when virtual keyboard opens/closes.
 * Prevents the page from panning/shifting upward and keeps input & messages cleanly pinned.
 */
export function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" && window.visualViewport
      ? window.visualViewport.height
      : null
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleResize = () => {
      setViewportHeight(window.visualViewport.height);
      // Prevent browser bounce-scroll when keyboard opens
      window.scrollTo(0, 0);
    };

    window.visualViewport.addEventListener("resize", handleResize);
    window.visualViewport.addEventListener("scroll", handleResize);

    return () => {
      window.visualViewport.removeEventListener("resize", handleResize);
      window.visualViewport.removeEventListener("scroll", handleResize);
    };
  }, []);

  return viewportHeight;
}
