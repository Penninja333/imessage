import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Avatar, Button } from "@heroui/react";
import {
  CheckIcon,
  SparklesIcon,
  Trash2Icon,
  UserCheckIcon,
  XIcon,
  ImageIcon,
  MicIcon,
  Link2Icon,
  ExternalLinkIcon,
  FilmIcon,
} from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useMediaViewerStore } from "../../store/useMediaViewerStore";
import { formatMessageTime } from "../../lib/utils";
import { withTransform } from "../../lib/imagekit";
import { MessageAudio } from "./MessageAudio";

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

export function ContactDetailsModal({ isOpen, onClose, peer }) {
  const setNickname = useChatStore((state) => state.setNickname);
  const messages = useChatStore((state) => state.messages);
  const authUser = useAuthStore((state) => state.authUser);
  const myId = authUser?._id ? String(authUser._id) : "";

  const [activeTab, setActiveTab] = useState("info"); // "info" | "media" | "voice" | "links"
  const [prevPeerNickname, setPrevPeerNickname] = useState(peer?.nickname || "");
  const [prevOpen, setPrevOpen] = useState(isOpen);
  const [nicknameInput, setNicknameInput] = useState(peer?.nickname || "");
  const [isSaving, setIsSaving] = useState(false);

  // Sync nicknameInput when modal opens or peer changes
  if (isOpen !== prevOpen || peer?.nickname !== prevPeerNickname) {
    setPrevOpen(isOpen);
    setPrevPeerNickname(peer?.nickname || "");
    if (isOpen) {
      setNicknameInput(peer?.nickname || "");
    }
  }

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Extract shared media (images & videos)
  const mediaList = useMemo(() => {
    return messages
      .filter((m) => !m.deleted && (m.image || m.video))
      .map((m) => {
        const isMine = String(m.senderId) === myId;
        const type = m.image ? "image" : "video";
        return {
          id: String(m._id),
          type,
          url: m.image || m.video,
          text: m.text || "",
          time: formatMessageTime(m.createdAt),
          senderName: isMine ? "You" : peer?.name || "Friend",
        };
      })
      .reverse(); // most recent first
  }, [messages, myId, peer]);

  // Extract shared voice memos
  const voiceList = useMemo(() => {
    return messages
      .filter((m) => !m.deleted && m.audio)
      .map((m) => {
        const isMine = String(m.senderId) === myId;
        return {
          id: String(m._id),
          audioUrl: m.audio,
          time: formatMessageTime(m.createdAt),
          senderName: isMine ? "You" : peer?.name || "Friend",
          isMine,
        };
      })
      .reverse();
  }, [messages, myId, peer]);

  // Extract shared links
  const linksList = useMemo(() => {
    const links = [];
    messages.forEach((m) => {
      if (m.deleted || !m.text) return;
      const matches = m.text.match(URL_REGEX);
      if (matches) {
        const isMine = String(m.senderId) === myId;
        matches.forEach((url) => {
          try {
            const parsed = new URL(url);
            links.push({
              id: `${m._id}-${url}`,
              url,
              hostname: parsed.hostname.replace(/^www\./, ""),
              time: formatMessageTime(m.createdAt),
              senderName: isMine ? "You" : peer?.name || "Friend",
            });
          } catch {
            // Invalid URL string, skip
          }
        });
      }
    });
    return links.reverse();
  }, [messages, myId, peer]);

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

  const handleOpenMediaItem = (item) => {
    useMediaViewerStore.getState().openMedia({
      media: item,
      mediaList,
    });
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

        {/* Sheet Top Navigation Bar */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <SparklesIcon className="size-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">Contact & Shared Media</h3>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (activeTab === "info" && hasChanged) {
                await handleSave();
              } else {
                onClose();
              }
            }}
            disabled={isSaving}
            className="flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold text-accent hover:bg-accent/10 active:scale-95 transition"
          >
            {isSaving ? "Saving..." : activeTab === "info" && hasChanged ? "Save" : "Done"}
          </button>
        </div>

        {/* Segmented Tab Navigation Controls */}
        <div className="flex border-b border-border/60 bg-surface/40 p-1.5 px-3 sm:px-5">
          <div className="flex w-full rounded-xl bg-surface/80 p-1 border border-border/50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === "info"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <UserCheckIcon className="size-3.5" />
              <span>Info</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("media")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === "media"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <ImageIcon className="size-3.5" />
              <span>Media</span>
              {mediaList.length > 0 ? (
                <span className="text-[10px] rounded-full bg-accent/20 px-1 text-accent font-bold">
                  {mediaList.length}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("voice")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === "voice"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <MicIcon className="size-3.5" />
              <span>Voice</span>
              {voiceList.length > 0 ? (
                <span className="text-[10px] rounded-full bg-accent/20 px-1 text-accent font-bold">
                  {voiceList.length}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("links")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === "links"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Link2Icon className="size-3.5" />
              <span>Links</span>
              {linksList.length > 0 ? (
                <span className="text-[10px] rounded-full bg-accent/20 px-1 text-accent font-bold">
                  {linksList.length}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {activeTab === "info" && (
            <div className="space-y-4">
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
          )}

          {activeTab === "media" && (
            <div className="space-y-3">
              {mediaList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-surface mb-3 text-muted/60">
                    <ImageIcon className="size-7" />
                  </div>
                  <p className="text-sm font-semibold text-foreground/80">No photos or videos</p>
                  <p className="text-xs text-muted mt-1">
                    Media shared in this conversation will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenMediaItem(item)}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-surface cursor-pointer active:scale-95 transition-all"
                    >
                      {item.type === "video" ? (
                        <div className="relative h-full w-full bg-black/40 flex items-center justify-center">
                          <video
                            src={item.url}
                            className="h-full w-full object-cover"
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/15 transition-colors">
                            <span className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs shadow-md">
                              <FilmIcon className="size-4" />
                            </span>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={withTransform(item.url, "q-auto,w-320,f-auto")}
                          alt={item.text || "Photo"}
                          loading="lazy"
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      )}
                      <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.time}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "voice" && (
            <div className="space-y-2.5">
              {voiceList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-surface mb-3 text-muted/60">
                    <MicIcon className="size-7" />
                  </div>
                  <p className="text-sm font-semibold text-foreground/80">No voice messages</p>
                  <p className="text-xs text-muted mt-1">
                    Voice messages sent or received will appear here.
                  </p>
                </div>
              ) : (
                voiceList.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1.5 rounded-2xl border border-border/70 bg-surface/60 p-3.5 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {item.senderName}
                      </span>
                      <span className="text-[11px] text-muted">{item.time}</span>
                    </div>
                    <MessageAudio src={item.audioUrl} isOwnMessage={item.isMine} />
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "links" && (
            <div className="space-y-2.5">
              {linksList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-surface mb-3 text-muted/60">
                    <Link2Icon className="size-7" />
                  </div>
                  <p className="text-sm font-semibold text-foreground/80">No shared links</p>
                  <p className="text-xs text-muted mt-1">
                    Links sent in messages will be collected here.
                  </p>
                </div>
              ) : (
                linksList.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface/60 p-3.5 backdrop-blur-md hover:border-accent/50 hover:bg-surface transition-all"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                        <Link2Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
                          {item.hostname}
                        </p>
                        <p className="truncate text-[11px] text-muted font-mono">
                          {item.url}
                        </p>
                        <span className="text-[10px] text-muted/70">
                          {item.senderName} • {item.time}
                        </span>
                      </div>
                    </div>
                    <ExternalLinkIcon className="size-4 shrink-0 text-muted group-hover:text-accent transition-colors" />
                  </a>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
