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

    let rafId = null;

    const handleResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!window.visualViewport) return;

        const newHeight = Math.round(window.visualViewport.height);
        setViewportHeight((prev) => {
          if (prev !== null && Math.abs(prev - newHeight) < 1) return prev;
          return newHeight;
        });

        // Only reset outer window scroll if it actually drifted
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
      });
    };

    window.visualViewport.addEventListener("resize", handleResize, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.visualViewport.removeEventListener("resize", handleResize);
    };
  }, []);

  return viewportHeight;
}
