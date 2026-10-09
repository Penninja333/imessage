import { useEffect, useRef } from "react";
import { Bell, Clock } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";

const MUTE_OPTIONS = [
  { duration: "1h", label: "1 hour" },
  { duration: "8h", label: "8 hours" },
  { duration: "1w", label: "1 week" },
  { duration: "always", label: "Forever" },
];

export function MuteConversationMenu({
  partnerId,
  isMuted,
  mutedUntil,
  isOpen,
  onClose,
}) {
  const muteConversation = useChatStore((state) => state.muteConversation);
  const unmuteConversation = useChatStore((state) => state.unmuteConversation);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMute = async (duration) => {
    await muteConversation(partnerId, duration);
    onClose();
  };

  const handleUnmute = async () => {
    await unmuteConversation(partnerId);
    onClose();
  };

  const formattedMuteExpiry = (() => {
    if (!mutedUntil) return "forever";
    const d = new Date(mutedUntil);
    if (isNaN(d.getTime())) return "forever";
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  })();

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1.5 z-40 w-52 overflow-hidden rounded-2xl border border-border/80 bg-background/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 fade-in-50 duration-150"
    >
      {isMuted ? (
        <div className="flex flex-col gap-1">
          <div className="px-3 py-1.5 text-[11px] text-muted">
            <span>Muted until </span>
            <span className="font-semibold text-foreground">{formattedMuteExpiry}</span>
          </div>
          <div className="h-px bg-border/60 mx-1" />
          <button
            type="button"
            onClick={handleUnmute}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-surface active:bg-surface/80 transition text-left"
          >
            <Bell className="size-4 text-accent" />
            <span>Unmute notifications</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <div className="px-3 py-1 text-[11px] font-semibold text-muted tracking-wide uppercase">
            Mute notifications
          </div>
          {MUTE_OPTIONS.map((opt) => (
            <button
              key={opt.duration}
              type="button"
              onClick={() => handleMute(opt.duration)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-surface active:bg-surface/80 transition text-left"
            >
              <Clock className="size-3.5 text-muted" />
              <span>For {opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
