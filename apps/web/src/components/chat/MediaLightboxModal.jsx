import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Loader2,
} from "lucide-react";
import { useMediaViewerStore } from "../../store/useMediaViewerStore";
import { isImageKitUrl, withTransform } from "../../lib/imagekit";
import toast from "react-hot-toast";

export default function MediaLightboxModal() {
  const isOpen = useMediaViewerStore((state) => state.isOpen);
  const activeMedia = useMediaViewerStore((state) => state.activeMedia);
  const mediaList = useMediaViewerStore((state) => state.mediaList);
  const currentIndex = useMediaViewerStore((state) => state.currentIndex);
  const closeMedia = useMediaViewerStore((state) => state.closeMedia);
  const nextMedia = useMediaViewerStore((state) => state.nextMedia);
  const prevMedia = useMediaViewerStore((state) => state.prevMedia);

  const containerRef = useRef(null);
  const [prevMediaKey, setPrevMediaKey] = useState(() => `${isOpen}-${activeMedia?.url || ""}`);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reset zoom & pan when media item changes or closes
  const currentMediaKey = `${isOpen}-${activeMedia?.url || ""}`;
  if (currentMediaKey !== prevMediaKey) {
    setPrevMediaKey(currentMediaKey);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsLoading(true);
  }

  // Touch gesture tracking for mobile swipe
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeMedia();
      } else if (e.key === "ArrowRight") {
        nextMedia();
      } else if (e.key === "ArrowLeft") {
        prevMedia();
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)));
      } else if (e.key === "-") {
        setZoom((z) => {
          const nextZ = Math.max(1, +(z - 0.5).toFixed(1));
          if (nextZ === 1) setPan({ x: 0, y: 0 });
          return nextZ;
        });
      } else if (e.key === "0") {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeMedia, nextMedia, prevMedia]);

  // Track browser native fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  const handleDownload = async () => {
    if (!activeMedia?.url) return;
    try {
      const response = await fetch(activeMedia.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const isVideo = activeMedia.type === "video";
      const ext = isVideo ? "mp4" : "jpg";
      a.download = `media-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: open URL directly in a new tab
      window.open(activeMedia.url, "_blank");
    }
  };

  const handleShare = async () => {
    if (!activeMedia?.url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: activeMedia.senderName ? `Media from ${activeMedia.senderName}` : "Shared Media",
          text: activeMedia.text || "",
          url: activeMedia.url,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          toast.error("Could not share media");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(activeMedia.url);
        toast.success("Media link copied to clipboard");
      } catch {
        toast.error("Sharing not supported");
      }
    }
  };

  const handleDoubleTap = useCallback(() => {
    setZoom((prev) => {
      if (prev > 1) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return 2;
    });
  }, []);

  // Mouse pan handlers when zoom > 1
  const handleMouseDown = (e) => {
    if (zoom <= 1 || e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile swipe navigation and swipe-down dismiss
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      if (zoom > 1) {
        dragStartRef.current = { x: touch.clientX, y: touch.clientY };
        panStartRef.current = { ...pan };
        setIsDragging(true);
      }
    }
  };

  const handleTouchMove = (e) => {
    if (zoom > 1 && isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (zoom > 1) {
      setIsDragging(false);
      return;
    }

    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Fast swipe or distance threshold
      if (deltaTime < 400 || Math.abs(deltaX) > 60 || Math.abs(deltaY) > 80) {
        // Vertical swipe down to dismiss
        if (deltaY > 100 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
          closeMedia();
          return;
        }

        // Horizontal swipe navigation between items
        if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          if (deltaX < 0) {
            nextMedia();
          } else {
            prevMedia();
          }
        }
      }
    }
  };

  if (!isOpen || !activeMedia) return null;

  const isVideo = activeMedia.type === "video";
  const hasMultiple = mediaList.length > 1;

  // High-res transform for ImageKit images (2560px for razor-sharp fullscreen)
  const highResImageUrl =
    !isVideo && isImageKitUrl(activeMedia.url)
      ? withTransform(activeMedia.url, "q-90,w-2560,f-auto")
      : activeMedia.url;

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      className="fixed inset-0 z-[99999] flex flex-col justify-between bg-black/95 select-none overflow-hidden touch-none animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Navigation & Controls Bar */}
      <header className="relative z-30 flex items-center justify-between border-b border-white/10 bg-black/60 px-3 py-2.5 sm:px-5 sm:py-3 text-white backdrop-blur-xl transition-opacity">
        {/* Left: Close button and Info */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={closeMedia}
            className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition text-white"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>

          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-semibold text-white/95 leading-tight">
              {activeMedia.senderName || "Media"}
            </span>
            {activeMedia.time ? (
              <span className="text-[10px] text-white/60 tabular-nums">
                {activeMedia.time}
              </span>
            ) : null}
          </div>

          {hasMultiple ? (
            <span className="ml-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white/80 tabular-nums">
              {currentIndex + 1} / {mediaList.length}
            </span>
          ) : null}
        </div>

        {/* Right: Actions (Zoom, Share, Download, Fullscreen) */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {!isVideo ? (
            <div className="hidden sm:flex items-center gap-0.5 rounded-full bg-white/10 p-0.5 mr-1">
              <button
                type="button"
                onClick={() => {
                  setZoom((z) => {
                    const nextZ = Math.max(1, +(z - 0.5).toFixed(1));
                    if (nextZ === 1) setPan({ x: 0, y: 0 });
                    return nextZ;
                  });
                }}
                disabled={zoom <= 1}
                className="flex size-7 items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent transition text-white"
                title="Zoom Out"
              >
                <ZoomOut className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="px-1.5 text-[11px] font-medium text-white/90 hover:text-white"
                title="Reset Zoom"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))}
                disabled={zoom >= 3}
                className="flex size-7 items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent transition text-white"
                title="Zoom In"
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>
          ) : null}

          {/* Share button */}
          <button
            type="button"
            onClick={handleShare}
            className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
            title="Share"
            aria-label="Share"
          >
            <Share2 className="size-4" />
          </button>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
            title="Download"
            aria-label="Download"
          >
            <Download className="size-4" />
          </button>

          {/* Toggle Native OS Fullscreen */}
          <button
            type="button"
            onClick={toggleNativeFullscreen}
            className="hidden sm:flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </header>

      {/* Center Media Viewport */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden w-full h-full p-2 sm:p-4"
        onClick={(e) => {
          // If user clicks the empty backdrop, close modal
          if (e.target === e.currentTarget && zoom === 1) {
            closeMedia();
          }
        }}
      >
        {/* Loading Spinner */}
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <Loader2 className="size-8 text-white/60 animate-spin" />
          </div>
        ) : null}

        {/* Previous Button */}
        {hasMultiple && currentIndex > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevMedia();
            }}
            className="absolute left-2 sm:left-4 z-20 flex size-10 sm:size-12 items-center justify-center rounded-full bg-black/60 border border-white/10 text-white shadow-xl backdrop-blur-md hover:bg-black/80 hover:scale-105 active:scale-95 transition"
            title="Previous (Left Arrow)"
            aria-label="Previous media"
          >
            <ChevronLeft className="size-6" />
          </button>
        ) : null}

        {/* Media Container */}
        {isVideo ? (
          <div className="flex h-full w-full items-center justify-center max-w-5xl">
            <video
              key={activeMedia.url}
              src={activeMedia.url}
              controls
              autoPlay
              playsInline
              preload="auto"
              onLoadedData={() => setIsLoading(false)}
              className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl outline-none"
            />
          </div>
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center transition-transform duration-100 ${
              zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
            }`}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleTap}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: "center center",
            }}
          >
            <img
              key={highResImageUrl}
              src={highResImageUrl}
              alt={activeMedia.text || "Shared photo"}
              onLoad={() => setIsLoading(false)}
              className="max-h-[84vh] max-w-full rounded-lg object-contain shadow-2xl pointer-events-none sm:pointer-events-auto select-none"
              draggable={false}
            />
          </div>
        )}

        {/* Next Button */}
        {hasMultiple && currentIndex < mediaList.length - 1 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextMedia();
            }}
            className="absolute right-2 sm:right-4 z-20 flex size-10 sm:size-12 items-center justify-center rounded-full bg-black/60 border border-white/10 text-white shadow-xl backdrop-blur-md hover:bg-black/80 hover:scale-105 active:scale-95 transition"
            title="Next (Right Arrow)"
            aria-label="Next media"
          >
            <ChevronRight className="size-6" />
          </button>
        ) : null}
      </div>

      {/* Bottom Bar: Text Caption if present */}
      {activeMedia.text ? (
        <footer className="relative z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
          <div className="max-w-2xl rounded-2xl bg-black/75 px-4 py-2.5 text-center text-sm font-medium text-white/95 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-auto">
            <p className="whitespace-pre-wrap break-words">{activeMedia.text}</p>
          </div>
        </footer>
      ) : (
        <div className="h-4 pb-[env(safe-area-inset-bottom)]" />
      )}
    </div>,
    document.body
  );
}
