import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Avatar, Button } from "@heroui/react";
import {
  CheckIcon,
  SparklesIcon,
  Trash2Icon,
  UserCheckIcon,
  XIcon,
} from "lucide-react";
import { useChatStore } from "../../store/useChatStore";

export function NicknameDetailsModal({ isOpen, onClose, peer }) {
  const setNickname = useChatStore((state) => state.setNickname);
  const [nicknameInput, setNicknameInput] = useState(peer?.nickname || "");
  const [isSaving, setIsSaving] = useState(false);

  // Sync nicknameInput whenever peer changes
  useEffect(() => {
    setNicknameInput(peer?.nickname || "");
  }, [peer?.nickname, isOpen]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !peer || typeof document === "undefined") return null;

  const currentNickname = peer.nickname || "";
  const hasChanged = nicknameInput.trim() !== currentNickname;

  const handleSave = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!hasChanged) {
      onClose();
      return;
    }

    if (!peer?.id) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await setNickname(String(peer.id), nicknameInput.trim());
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!peer?.id) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await setNickname(String(peer.id), "");
      setNicknameInput("");
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:justify-center md:items-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop tap to dismiss */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      {/* iOS Style Sheet (mobile) / Dialog (desktop) */}
      <div className="relative z-10 flex w-full flex-col overflow-hidden border-border bg-background text-foreground shadow-2xl transition-all md:max-w-md md:rounded-3xl md:border max-h-[88dvh] rounded-t-3xl border-t pb-[max(1.2rem,env(safe-area-inset-bottom))] md:pb-5 animate-in slide-in-from-bottom duration-250">
        {/* Mobile drag handle bar */}
        <div className="flex w-full justify-center pt-3 pb-1 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-muted/30" />
        </div>

        {/* Sheet Top Navigation Bar */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <SparklesIcon className="size-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">Contact Info</h3>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (hasChanged) {
                await handleSave();
              } else {
                onClose();
              }
            }}
            disabled={isSaving}
            className="flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold text-accent hover:bg-accent/10 active:scale-95 transition"
          >
            {isSaving ? "Saving..." : hasChanged ? "Save" : "Done"}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
          {/* Profile Hero */}
          <div className="flex flex-col items-center text-center pt-1 pb-2">
            <div className="relative">
              <Avatar className="size-20 border-2 border-border shadow-md">
                <Avatar.Image alt={peer.name} src={peer.avatarUrl} />
                <Avatar.Fallback className="text-xl font-bold">{peer.initials}</Avatar.Fallback>
              </Avatar>
              {peer.isOnline ? (
                <span className="absolute bottom-1 right-1 size-4 rounded-full border-2 border-background bg-success ring-1 ring-background" />
              ) : null}
            </div>

            <h4 className="mt-2.5 text-lg font-bold text-foreground">{peer.fullName}</h4>
            <p className="text-xs text-muted">{peer.subtitle || (peer.isOnline ? "Active now" : "Offline")}</p>
          </div>

          {/* Card: Set Nickname */}
          <div className="rounded-2xl border border-border/70 bg-surface/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="nickname-input" className="text-xs font-semibold uppercase tracking-wider text-muted">
                Your Nickname for {peer.fullName?.split(" ")[0] || "User"}
              </label>
              <span className="text-[10px] text-muted">{nicknameInput.length}/32</span>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-2.5">
              <div className="relative flex items-center">
                <input
                  id="nickname-input"
                  type="text"
                  maxLength={32}
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder={`e.g. Bestie, ${peer.fullName?.split(" ")[0] || ""}`}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all pr-8"
                />
                {nicknameInput ? (
                  <button
                    type="button"
                    onClick={() => setNicknameInput("")}
                    className="absolute right-2.5 text-muted hover:text-foreground p-0.5"
                    aria-label="Clear input"
                  >
                    <XIcon className="size-4" />
                  </button>
                ) : null}
              </div>

              <p className="text-[11px] text-muted/80">
                This name will replace {peer.fullName?.split(" ")[0] || "their"}'s name in your chat header, list, and alerts.
              </p>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                isDisabled={!hasChanged || isSaving}
                className={`w-full mt-1 font-semibold transition-all ${
                  hasChanged
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-surface text-muted"
                }`}
                isLoading={isSaving}
              >
                <CheckIcon className="size-4 mr-1.5" /> Save Nickname
              </Button>
            </form>
          </div>

          {/* Card: What they call YOU */}
          <div className="rounded-2xl border border-border/70 bg-surface/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                What {peer.fullName?.split(" ")[0] || "They"} Call You
              </span>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                Shared
              </span>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-muted">
                <UserCheckIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                {peer.myNickname ? (
                  <p className="text-sm font-bold text-foreground truncate">
                    &ldquo;{peer.myNickname}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs italic text-muted">
                    No nickname set for you yet
                  </p>
                )}
                <p className="text-[10px] text-muted/70">
                  {peer.myNickname
                    ? `Set by ${peer.fullName?.split(" ")[0] || "friend"}`
                    : `Only ${peer.fullName?.split(" ")[0] || "friend"} can set your nickname`}
                </p>
              </div>
            </div>
          </div>

          {/* Action: Clear Nickname */}
          {peer.nickname ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs font-semibold text-danger hover:bg-danger/15 active:scale-95 transition"
            >
              <Trash2Icon className="size-4" />
              <span>Remove Nickname</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
