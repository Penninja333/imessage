import { useEffect, useRef, useCallback } from "react";
import { SearchIcon, XIcon, LoaderIcon } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { formatMessageTime } from "../../lib/utils";
import { AppleEmojiText } from "../common/AppleEmoji";
import { withTransform } from "../../lib/imagekit";

function highlightMatch(text, query) {
  if (!text || !query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/30 text-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function GlobalSearchModal() {
  const isOpen = useChatStore((state) => state.isGlobalSearchOpen);
  const setGlobalSearchOpen = useChatStore((state) => state.setGlobalSearchOpen);
  const globalSearch = useChatStore((state) => state.globalSearch);
  const results = useChatStore((state) => state.globalSearchResults);
  const isSearching = useChatStore((state) => state.isGlobalSearching);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const setActiveMatchId = useChatStore((state) => state.setActiveMatchId);

  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const queryRef = useRef("");

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      queryRef.current = "";
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") setGlobalSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, setGlobalSearchOpen]);

  const handleInput = useCallback(
    (e) => {
      const q = e.target.value;
      queryRef.current = q;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        globalSearch(q);
      }, 350);
    },
    [globalSearch],
  );

  const handleResultClick = (result) => {
    setGlobalSearchOpen(false);
    setActiveConversationId(result.conversationId);
    // Give store time to load messages, then jump to the specific message
    setTimeout(() => {
      setActiveMatchId(result.messageId);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setGlobalSearchOpen(false);
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <SearchIcon className="size-4.5 shrink-0 text-muted" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search all messages…"
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted/60"
            onChange={handleInput}
          />
          {isSearching ? (
            <LoaderIcon className="size-4 shrink-0 animate-spin text-muted" />
          ) : (
            <button
              type="button"
              onClick={() => setGlobalSearchOpen(false)}
              className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground transition"
              aria-label="Close search"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 && !isSearching ? (
            <p className="px-4 py-6 text-center text-sm text-muted/70">
              {queryRef.current.length >= 2 ? "No messages found" : "Start typing to search"}
            </p>
          ) : (
            <ul>
              {results.map((result) => (
                <li key={result.messageId}>
                  <button
                    type="button"
                    onClick={() => handleResultClick(result)}
                    className="flex w-full items-start gap-3 px-4 py-3 hover:bg-surface/70 active:bg-surface transition text-left"
                  >
                    {/* Peer avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      {result.peerAvatar ? (
                        <img
                          src={withTransform(result.peerAvatar, "q-auto,w-80,f-auto")}
                          alt={result.peerName}
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                          {result.peerName?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-semibold text-foreground">
                          {result.peerName}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted tabular-nums">
                          {formatMessageTime(result.createdAt)}
                        </span>
                      </div>
                      <p className="truncate text-[12px] text-muted leading-snug">
                        {result.isMine ? (
                          <span className="text-accent/80 font-medium">You: </span>
                        ) : null}
                        <AppleEmojiText text={result.text} disableBigEmoji />
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
