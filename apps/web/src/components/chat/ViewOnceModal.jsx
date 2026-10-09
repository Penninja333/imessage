import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ShieldCheck } from "lucide-react";

/**
 * ViewOnceModal
 *
 * Fullscreen viewer for ephemeral "View Once" photos.
 * Displays photo once with copy/download protections, then permanently locks when dismissed.
 */
export function ViewOnceModal({
  isOpen,
  imageUrl,
  senderName,
  onClose,
}) {
  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="View once photo"
      className="fixed inset-0 z-[99999] flex flex-col justify-between bg-black/95 backdrop-blur-3xl select-none animate-in fade-in duration-200"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/60 px-4 py-3 sm:px-6 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-full bg-accent/20 text-accent ring-1 ring-accent/30">
            <span className="flex size-4.5 items-center justify-center rounded-full border border-current text-[10px] font-black leading-none">
              1
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-semibold text-white leading-tight">
              View Once Photo
            </span>
            {senderName ? (
              <span className="text-[11px] text-zinc-400 leading-tight">
                From {senderName}
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white active:scale-95 transition"
          aria-label="Close photo"
          title="Close (photo will expire)"
        >
          <X className="size-4.5" />
        </button>
      </header>

      {/* Main Photo Viewport */}
      <main className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        <img
          src={imageUrl}
          alt="View once photo"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl pointer-events-auto select-none animate-in zoom-in-95 duration-200"
        />
      </main>

      {/* Bottom Footer Notice */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 bg-black/60 px-4 py-3 sm:px-6 backdrop-blur-xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <ShieldCheck className="size-4 text-accent" />
          <span>This photo cannot be viewed again once closed</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto rounded-full bg-white/15 px-6 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-white/25 active:scale-95 transition shadow-sm"
        >
          Done
        </button>
      </footer>
    </div>,
    document.body,
  );
}
