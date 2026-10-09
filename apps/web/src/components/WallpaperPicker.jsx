import { useState, useEffect, useCallback, useTransition } from "react";
import { createPortal } from "react-dom";
import { Button } from "@heroui/react";
import { Check, ImageIcon, X } from "lucide-react";
import { useWallpaper } from "../context/wallpaper";
import { WALLPAPER_SECTIONS, WALLPAPERS } from "../data/wallpapers";

function WallpaperThumb({ wallpaper, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(wallpaper.id)}
      className={[
        "relative aspect-4/3 w-full overflow-hidden rounded-xl bg-zinc-900 contain-[layout] cursor-pointer active:scale-95 transition-all",
        selected
          ? "ring-2 ring-accent ring-offset-2 ring-offset-[#2a2a2c]"
          : "outline-1 outline-transparent hover:outline-white/45",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a2a2c]",
      ].join(" ")}
      aria-pressed={selected}
    >
      <img
        src={wallpaper.url}
        alt={wallpaper.label}
        width={320}
        height={240}
        className="pointer-events-none h-full w-full object-cover select-none"
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
        referrerPolicy="no-referrer"
        draggable={false}
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-black/60 backdrop-blur-[2px] px-2 py-1 text-left text-[11px] font-medium leading-tight text-white/95">
        {wallpaper.label}
      </span>
      {selected ? (
        <span className="absolute right-1.5 top-1.5 z-10 flex size-5.5 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md ring-2 ring-white/20">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

export function WallpaperPicker({ isOpen, onClose }) {
  const isControlled = isOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isModalOpen = isControlled ? Boolean(isOpen) : internalOpen;

  const { wallpaperId, setWallpaperId } = useWallpaper();
  const [, startTransition] = useTransition();

  const handleClose = useCallback(() => {
    if (isControlled) {
      if (onClose) onClose();
    } else {
      setInternalOpen(false);
    }
  }, [isControlled, onClose]);

  const handleSelect = (id) => {
    startTransition(() => {
      setWallpaperId(id);
    });
    handleClose();
  };

  // Dismiss on Escape key
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, handleClose]);

  const modalContent =
    isModalOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:justify-center md:items-center bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop tap to dismiss */}
            <div className="absolute inset-0" onClick={handleClose} aria-hidden />

            {/* iOS Style Sheet (mobile) / Centered Dialog (desktop) */}
            <div className="relative z-10 flex w-full flex-col overflow-hidden border-border bg-[#2a2a2c] text-white shadow-2xl transition-all md:max-w-2xl md:rounded-3xl md:border max-h-[85dvh] rounded-t-3xl border-t pb-[max(1.2rem,env(safe-area-inset-bottom))] md:pb-5 animate-in slide-in-from-bottom duration-250">
              {/* Mobile drag handle bar */}
              <div className="flex w-full justify-center pt-3 pb-1 md:hidden">
                <div className="h-1.5 w-12 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-accent/20 text-accent">
                    <ImageIcon className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">Chat Wallpaper</h3>
                    <p className="text-[11px] text-zinc-400 leading-none mt-0.5">
                      Applied inside your chat conversations
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="flex size-7 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white active:scale-95 transition"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto space-y-6 px-4 py-4 sm:px-6 sm:py-5">
                {WALLPAPER_SECTIONS.map((section) => (
                  <section key={section.id} className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {section.title}
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                      {WALLPAPERS.filter((w) => w.category === section.id).map((w) => (
                        <WallpaperThumb
                          key={w.id}
                          wallpaper={w}
                          selected={wallpaperId === w.id}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  if (isControlled) {
    return modalContent;
  }

  return (
    <>
      <Button
        variant="ghost"
        isIconOnly
        className="size-9 text-foreground"
        aria-label="Chat Wallpaper"
        title="Chat Wallpaper"
        onPress={() => setInternalOpen(true)}
      >
        <ImageIcon className="size-4.5" />
      </Button>
      {modalContent}
    </>
  );
}
