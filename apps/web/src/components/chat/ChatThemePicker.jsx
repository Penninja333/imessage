import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Palette, Pipette, X } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useTheme } from "../../context/theme";
import { useWallpaper } from "../../context/wallpaper";
import { CHAT_THEMES, getThemeById } from "../../data/chatThemes";
import { AppleEmoji } from "../common/AppleEmoji";

export function ChatThemePicker({ isOpen, onClose, partnerId, partnerName }) {
  const currentThemeId = useChatStore(
    (s) => (partnerId ? (s.conversationThemes[String(partnerId)] ?? "default") : "default"),
  );
  const setConversationTheme = useChatStore((s) => s.setConversationTheme);
  const { theme: colorMode } = useTheme();
  const { frameStyle } = useWallpaper();

  const [prevOpen, setPrevOpen] = useState(isOpen);
  const [prevThemeId, setPrevThemeId] = useState(currentThemeId);
  const [selectedThemeId, setSelectedThemeId] = useState(currentThemeId);
  const [isSaving, setIsSaving] = useState(false);

  // Custom hex color picker state
  const initialCustomHex =
    currentThemeId.startsWith("custom-#") && currentThemeId.length === 14
      ? currentThemeId.slice(7)
      : "007AFF";
  const [customHex, setCustomHex] = useState(`#${initialCustomHex}`);
  const [hexInput, setHexInput] = useState(initialCustomHex);

  // Sync selected theme when modal opens or currentThemeId changes
  if (isOpen !== prevOpen || currentThemeId !== prevThemeId) {
    setPrevOpen(isOpen);
    setPrevThemeId(currentThemeId);
    if (isOpen) {
      setSelectedThemeId(currentThemeId);
      if (currentThemeId.startsWith("custom-#") && currentThemeId.length === 14) {
        const hex = currentThemeId.slice(7);
        setCustomHex(`#${hex}`);
        setHexInput(hex);
      }
    }
  }

  const handleCustomColorChange = (hex) => {
    setCustomHex(hex);
    const clean = hex.replace("#", "").toLowerCase();
    setHexInput(clean);
    setSelectedThemeId(`custom-#${clean}`);
  };

  const handleHexInputChange = (val) => {
    const clean = val.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
    setHexInput(clean);
    if (clean.length === 6) {
      setCustomHex(`#${clean}`);
      setSelectedThemeId(`custom-#${clean.toLowerCase()}`);
    }
  };


  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const selectedTheme = getThemeById(selectedThemeId);
  const hasChanged = selectedThemeId !== currentThemeId;

  // Resolve preview background based on light / dark / glass mode
  const isDarkish = colorMode === "dark" || colorMode === "glass";
  const customBgStyle = isDarkish && selectedTheme.darkBgStyle ? selectedTheme.darkBgStyle : selectedTheme.bgStyle;
  const isCustom = Boolean(selectedTheme.id !== "default" && customBgStyle);

  const handleApply = async () => {
    if (!partnerId) {
      onClose();
      return;
    }
    if (!hasChanged) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await setConversationTheme(String(partnerId), selectedThemeId);
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
      <div className="relative z-10 flex w-full flex-col overflow-hidden border-border bg-background text-foreground shadow-2xl transition-all md:max-w-lg md:rounded-3xl md:border max-h-[90dvh] rounded-t-3xl border-t pb-[max(1.2rem,env(safe-area-inset-bottom))] md:pb-5 animate-in slide-in-from-bottom duration-250">
        {/* Mobile drag handle bar */}
        <div className="flex w-full justify-center pt-3 pb-1 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-muted/30" />
        </div>

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Palette className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground leading-tight">Chat Theme</h3>
              <p className="text-[11px] text-muted leading-none mt-0.5">
                Shared with {partnerName || "friend"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground active:scale-95 transition"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 space-y-4">
          {/* Live Preview Card */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted px-0.5">
              Live Preview
            </span>
            <div
              className="relative overflow-hidden rounded-2xl border border-border/70 p-3.5 shadow-inner transition-all duration-300"
              style={frameStyle || undefined}
            >
              {/* Wallpaper contrast scrim */}
              <div
                className="pointer-events-none absolute inset-0 z-0 bg-background/30 dark:bg-background/45 backdrop-blur-[0.5px]"
                aria-hidden="true"
              />

              {/* Theme ambient wash */}
              {isCustom && customBgStyle?.background ? (
                <div
                  className="pointer-events-none absolute inset-0 z-0 transition-all duration-300"
                  style={{
                    backgroundColor: customBgStyle.background,
                    opacity: 0.50,
                  }}
                  aria-hidden="true"
                />
              ) : null}

              <div className="relative z-10">
                {/* Partner message bubble */}
                <div className="flex justify-start mb-2">
                  <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-surface px-3 py-1.5 text-xs text-foreground shadow-xs border border-border/40">
                    <span>How does this theme look? ✨</span>
                  </div>
                </div>

                {/* My message bubble with active theme style */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] rounded-2xl rounded-br-sm px-3 py-1.5 text-xs shadow-xs transition-all duration-300"
                    style={
                      selectedTheme.bubbleColor
                        ? {
                            background: selectedTheme.bubbleColor,
                            color: selectedTheme.bubbleText || "#fff",
                          }
                        : {
                            backgroundColor: "var(--accent, #3b82f6)",
                            color: "#fff",
                          }
                    }
                  >
                    <span className="font-medium inline-flex items-center gap-1">
                      Looks great! Syncs to both phones
                      {selectedTheme.emoji ? (
                        <AppleEmoji char={selectedTheme.emoji} size={14} interactive={false} />
                      ) : null}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Color Wheel Section */}
          <div className="rounded-2xl border border-border/80 bg-surface/40 p-3">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Pipette className="size-3.5 text-accent" />
                Custom Color Wheel
              </span>
              {selectedThemeId.startsWith("custom-#") && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                  <Check className="size-3" strokeWidth={3} />
                  Active Custom
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Native color wheel trigger */}
              <label className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full p-0.5 shadow-md ring-2 ring-border/80 transition-transform hover:scale-105 active:scale-95 group">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  aria-label="Pick custom chat color"
                />
                <span
                  className="size-full rounded-full border border-black/15 shadow-inner transition-colors"
                  style={{ backgroundColor: customHex }}
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white drop-shadow-sm group-hover:scale-110 transition-transform">
                  <Palette className="size-4 opacity-90" />
                </span>
              </label>

              {/* Hex Input and Action */}
              <div className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">
                    #
                  </span>
                  <input
                    type="text"
                    value={hexInput}
                    maxLength={6}
                    placeholder="007AFF"
                    onChange={(e) => handleHexInputChange(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background py-1.5 pl-6 pr-3 font-mono text-xs uppercase text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedThemeId(`custom-#${hexInput.toLowerCase().padStart(6, "0")}`)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                    selectedThemeId.startsWith("custom-#")
                      ? "bg-accent text-accent-foreground shadow-xs"
                      : "bg-surface hover:bg-surface/80 text-foreground border border-border"
                  }`}
                >
                  Set Hex
                </button>
              </div>
            </div>
          </div>

          {/* Theme Presets Grid */}
          <div>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Preset Themes
              </span>
              <span className="text-[11px] text-muted inline-flex items-center gap-1">
                {selectedTheme.label}
                {selectedTheme.emoji ? (
                  <AppleEmoji char={selectedTheme.emoji} size={13} />
                ) : null}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-4">
              {CHAT_THEMES.map((t) => {
                const isSelected = selectedThemeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedThemeId(t.id)}
                    className={`relative flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center transition-all ${
                      isSelected
                        ? "bg-accent/10 ring-2 ring-accent shadow-xs scale-[1.02]"
                        : "hover:bg-surface/80 active:scale-95"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <span className="relative">
                      {/* Swatch circle */}
                      <span
                        className="block size-12 shrink-0 rounded-full shadow-md ring-2 ring-white/10 transition-transform"
                        style={{ background: t.swatch }}
                      />

                      {/* Accent Emoji Badge on Swatch */}
                      {t.emoji ? (
                        <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-background/95 shadow-sm border border-border/80">
                          <AppleEmoji char={t.emoji} size={12} />
                        </span>
                      ) : null}

                      {/* Selection Checkmark */}
                      {isSelected ? (
                        <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md ring-2 ring-background">
                          <Check className="size-2.5" strokeWidth={3} />
                        </span>
                      ) : null}
                    </span>

                    <span
                      className={`text-[11px] font-medium leading-tight truncate max-w-full ${
                        isSelected ? "font-bold text-accent" : "text-muted"
                      }`}
                    >
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 pt-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2 text-xs font-semibold text-muted hover:bg-surface hover:text-foreground active:scale-98 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isSaving || !hasChanged}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold shadow-xs active:scale-98 transition ${
              hasChanged
                ? "bg-accent text-accent-foreground hover:opacity-90"
                : "bg-surface text-muted/60 cursor-not-allowed"
            }`}
          >
            {isSaving ? "Updating theme..." : hasChanged ? "Apply Theme" : "Current Theme"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
