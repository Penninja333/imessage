import { useEffect, useRef, useState, useMemo } from "react";
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";

export function InChatSearch({ onNavigateMatch }) {
  const inChatSearchQuery = useChatStore((state) => state.inChatSearchQuery);
  const setInChatSearchQuery = useChatStore((state) => state.setInChatSearchQuery);
  const toggleInChatSearch = useChatStore((state) => state.toggleInChatSearch);
  const setActiveMatchId = useChatStore((state) => state.setActiveMatchId);
  const messages = useChatStore((state) => state.messages);

  const inputRef = useRef(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Focus input automatically when mounted and clean up activeMatchId on unmount
  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      setActiveMatchId(null);
    };
  }, [setActiveMatchId]);

  // Filter messages that contain the query
  const query = inChatSearchQuery.trim().toLowerCase();
  const matchingMessageIds = useMemo(() => {
    if (!query) return [];
    return messages
      .filter((m) => !m.deleted && m.text && m.text.toLowerCase().includes(query))
      .map((m) => String(m._id));
  }, [messages, query]);

  const totalMatches = matchingMessageIds.length;

  // Reset match index when query changes
  useEffect(() => {
    setCurrentMatchIndex(totalMatches > 0 ? 0 : -1);
    const targetId = totalMatches > 0 ? matchingMessageIds[0] : null;
    setActiveMatchId(targetId);
    if (targetId && onNavigateMatch) {
      onNavigateMatch(targetId);
    }
  }, [matchingMessageIds, totalMatches, onNavigateMatch, setActiveMatchId]);

  const handleNext = () => {
    if (totalMatches === 0) return;
    const nextIdx = (currentMatchIndex + 1) % totalMatches;
    setCurrentMatchIndex(nextIdx);
    const targetId = matchingMessageIds[nextIdx];
    setActiveMatchId(targetId);
    if (onNavigateMatch) onNavigateMatch(targetId);
  };

  const handlePrev = () => {
    if (totalMatches === 0) return;
    const prevIdx = (currentMatchIndex - 1 + totalMatches) % totalMatches;
    setCurrentMatchIndex(prevIdx);
    const targetId = matchingMessageIds[prevIdx];
    setActiveMatchId(targetId);
    if (onNavigateMatch) onNavigateMatch(targetId);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      toggleInChatSearch(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  return (
    <div className="flex w-full items-center gap-2 border-b border-border/80 bg-background/95 px-3 py-2 text-sm backdrop-blur-md animate-in slide-in-from-top-1 duration-200">
      <div className="relative flex flex-1 items-center">
        <SearchIcon className="pointer-events-none absolute left-3 size-4 text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={inChatSearchQuery}
          onChange={(e) => setInChatSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search in conversation..."
          className="w-full rounded-full border border-border bg-surface/70 py-1.5 pr-8 pl-9 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
        />
        {inChatSearchQuery ? (
          <button
            type="button"
            onClick={() => setInChatSearchQuery("")}
            className="absolute right-2.5 text-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>

      {query ? (
        <span className="shrink-0 text-xs font-medium text-muted tabular-nums">
          {totalMatches > 0
            ? `${currentMatchIndex + 1} of ${totalMatches}`
            : "No matches"}
        </span>
      ) : null}

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={handlePrev}
          disabled={totalMatches <= 1}
          className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition"
          aria-label="Previous match"
          title="Previous match (Shift+Enter)"
        >
          <ChevronUpIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={totalMatches <= 1}
          className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition"
          aria-label="Next match"
          title="Next match (Enter)"
        >
          <ChevronDownIcon className="size-4" />
        </button>

        <div className="mx-0.5 h-4 w-px bg-border" />

        <button
          type="button"
          onClick={() => toggleInChatSearch(false)}
          className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground active:scale-95 transition"
          aria-label="Close search"
          title="Close search (Esc)"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
