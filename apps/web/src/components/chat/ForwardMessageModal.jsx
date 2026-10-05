import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Search, CornerUpRight, LoaderIcon, Check } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { AppleEmojiText } from "../common/AppleEmoji";
import { withTransform } from "../../lib/imagekit";

export function ForwardMessageModal({ isOpen, message, onClose }) {
  const conversations = useChatStore((state) => state.conversations);
  const users = useChatStore((state) => state.users);
  const forwardMessage = useChatStore((state) => state.forwardMessage);

  const [search, setSearch] = useState("");
  const [forwardingToId, setForwardingToId] = useState(null);
  const [forwardedIds, setForwardedIds] = useState(new Set());

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setForwardingToId(null);
      setForwardedIds(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Combine conversations and users into a deduped list
  const contactList = useMemo(() => {
    const map = new Map();
    for (const c of conversations) {
      const id = String(c._id);
      map.set(id, {
        id,
        name: c.nickname || c.fullName,
        avatar: c.profilePic,
        isConversation: true,
      });
    }
    for (const u of users) {
      const id = String(u._id);
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: u.nickname || u.fullName,
          avatar: u.profilePic,
          isConversation: false,
        });
      }
    }
    return Array.from(map.values());
  }, [conversations, users]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contactList;
    return contactList.filter((c) => c.name.toLowerCase().includes(q));
  }, [contactList, search]);

  if (!isOpen || !message) return null;

  const handleForward = async (targetId) => {
    if (forwardingToId || forwardedIds.has(targetId)) return;
    setForwardingToId(targetId);

    const success = await forwardMessage(message.id, targetId);
    setForwardingToId(null);

    if (success) {
      setForwardedIds((prev) => new Set([...prev, targetId]));
      // Close after short delay
      setTimeout(() => {
        onClose();
      }, 400);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 flex w-full max-w-md flex-col rounded-3xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <CornerUpRight className="size-4.5 text-accent" />
            <h3 className="text-base font-semibold text-foreground">Forward Message</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground transition"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="border-b border-border/40 bg-surface/40 px-4 py-2.5 sm:px-5 flex items-center gap-3">
          {message.imageUrl ? (
            <img
              src={withTransform(message.imageUrl, "q-auto,w-120,f-auto")}
              alt="Message preview"
              className="size-10 rounded-lg object-cover shrink-0"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-xs text-muted leading-snug">
              {message.imageUrl && !message.text ? (
                "📷 Photo"
              ) : message.videoUrl ? (
                "🎥 Video"
              ) : message.audioUrl ? (
                "🎤 Voice message"
              ) : (
                <AppleEmojiText text={message.text || ""} disableBigEmoji />
              )}
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="px-4 pt-3 pb-2 sm:px-5">
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-surface/70 px-3 py-1.5 focus-within:border-accent transition">
            <Search className="size-4 text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted hover:text-foreground text-xs"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {filteredContacts.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              No contacts found
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filteredContacts.map((contact) => {
                const isForwarding = forwardingToId === contact.id;
                const isSent = forwardedIds.has(contact.id);

                return (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2 hover:bg-surface/70 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {contact.avatar ? (
                        <img
                          src={withTransform(contact.avatar, "q-auto,w-80,f-auto")}
                          alt={contact.name}
                          className="size-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-9 rounded-full bg-accent/20 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                          {contact.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <span className="truncate text-sm font-medium text-foreground">
                        {contact.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isForwarding || isSent}
                      onClick={() => handleForward(contact.id)}
                      className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold shadow-xs transition active:scale-95 ${
                        isSent
                          ? "bg-emerald-500/20 text-emerald-500"
                          : "bg-accent text-accent-foreground hover:brightness-105"
                      }`}
                    >
                      {isForwarding ? (
                        <LoaderIcon className="size-3.5 animate-spin" />
                      ) : isSent ? (
                        <>
                          <Check className="size-3.5" />
                          <span>Sent</span>
                        </>
                      ) : (
                        <span>Send</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
