import { useState, useRef, useEffect } from "react";
import { withTransform } from "../../lib/imagekit";
import { MessageVideo } from "./MessageVideo";
import { MessageAudio } from "./MessageAudio";
import { CopyIcon, SparklesIcon, Trash2Icon, SmileIcon } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import toast from "react-hot-toast";

// Compress + size images for the bubble (q-auto works for images; f-auto picks WebP/AVIF).
const IMAGE_TRANSFORM = "q-auto,w-640,f-auto";

const TAPBACK_EMOJIS = ["❤️", "👍", "👎", "😂", "‼️", "❓"];

export function MessageBubble({ message, showTime = true }) {
  const toggleReaction = useChatStore((state) => state.toggleReaction);
  const deleteMessage = useChatStore((state) => state.deleteMessage);

  const [showTapback, setShowTapback] = useState(false);
  const longPressTimerRef = useRef(null);
  const bubbleRef = useRef(null);

  // Close tapback menu when tapping outside
  useEffect(() => {
    if (!showTapback) return;
    const handleClickOutside = (e) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target)) {
        setShowTapback(false);
      }
    };
    window.addEventListener("pointerdown", handleClickOutside);
    return () => window.removeEventListener("pointerdown", handleClickOutside);
  }, [showTapback]);

  // System events (e.g. Nickname updated)
  if (message.isSystem) {
    return (
      <div className="my-2.5 flex w-full justify-center px-4">
        <div className="flex max-w-[85%] flex-wrap items-center justify-center gap-1.5 rounded-full border border-border/60 bg-surface/70 px-3.5 py-1.5 text-center text-xs text-muted shadow-xs backdrop-blur-md">
          <SparklesIcon className="size-3.5 shrink-0 text-accent" />
          <span className="font-medium text-foreground/90">{message.text}</span>
          <span className="text-[10px] text-muted-foreground/60">· {message.time}</span>
        </div>
      </div>
    );
  }

  const isOwnMessage = message.role === "me";
  const hasImage = Boolean(message.imageUrl);
  const hasVideo = Boolean(message.videoUrl);
  const hasAudio = Boolean(message.audioUrl);
  const isDeleted = Boolean(message.deleted);

  // Group reactions by emoji: { "❤️": 2, "👍": 1 }
  const reactionCounts = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  // Long press detection for mobile
  const handleTouchStart = () => {
    if (isDeleted) return;
    longPressTimerRef.current = setTimeout(() => {
      setShowTapback(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 400);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCopy = async () => {
    if (!message.text) return;
    try {
      await navigator.clipboard.writeText(message.text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    } finally {
      setShowTapback(false);
    }
  };

  const handleDelete = async () => {
    setShowTapback(false);
    await deleteMessage(message.id);
  };

  const handleSelectReaction = async (emoji) => {
    setShowTapback(false);
    await toggleReaction(message.id, emoji);
  };

  return (
    <div
      ref={bubbleRef}
      className={`group relative flex w-full flex-col ${
        isOwnMessage ? "items-end" : "items-start"
      } my-0.5 select-text`}
    >
      {/* Tapback Reaction Floating Bar */}
      {showTapback && !isDeleted && (
        <div
          className={`absolute -top-12 z-30 flex items-center gap-1 rounded-full border border-border/80 bg-background/95 p-1 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-150 ${
            isOwnMessage ? "right-1" : "left-1"
          }`}
        >
          {TAPBACK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelectReaction(emoji)}
              className="flex size-8 items-center justify-center rounded-full text-base hover:scale-125 active:scale-95 transition-transform"
            >
              {emoji}
            </button>
          ))}

          <div className="h-4 w-px bg-border/80 mx-0.5" />

          {message.text ? (
            <button
              type="button"
              onClick={handleCopy}
              className="flex size-7 items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-surface transition"
              title="Copy"
            >
              <CopyIcon className="size-3.5" />
            </button>
          ) : null}

          {isOwnMessage ? (
            <button
              type="button"
              onClick={handleDelete}
              className="flex size-7 items-center justify-center rounded-full text-danger hover:bg-danger/10 transition"
              title="Delete message"
            >
              <Trash2Icon className="size-3.5" />
            </button>
          ) : null}
        </div>
      )}

      {/* Message Bubble Container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onContextMenu={(e) => {
          if (!isDeleted) {
            e.preventDefault();
            setShowTapback(true);
          }
        }}
        className={`relative max-w-[min(90%,28rem)] rounded-2xl px-3.5 py-2 text-[15px] leading-snug sm:max-w-[min(75%,28rem)] transition-shadow ${
          isOwnMessage
            ? "rounded-br-sm bg-accent text-accent-foreground"
            : "rounded-bl-sm bg-surface text-foreground"
        } ${showTapback ? "ring-2 ring-accent" : ""}`}
      >
        {hasImage ? (
          <img
            src={withTransform(message.imageUrl, IMAGE_TRANSFORM)}
            alt=""
            loading="lazy"
            className="mb-1.5 max-h-48 max-w-full rounded-lg object-cover sm:max-h-56 sm:rounded-xl"
          />
        ) : null}

        {hasVideo ? <MessageVideo src={message.videoUrl} /> : null}
        {hasAudio ? <MessageAudio src={message.audioUrl} isOwnMessage={isOwnMessage} /> : null}

        {message.text ? (
          <p
            className={`whitespace-pre-wrap wrap-break-word ${
              isDeleted ? "italic opacity-60 text-xs" : ""
            }`}
          >
            {message.text}
          </p>
        ) : null}

        {/* Small desktop quick-react trigger button on hover */}
        {!isDeleted && (
          <button
            type="button"
            onClick={() => setShowTapback(!showTapback)}
            className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex size-6 items-center justify-center rounded-full bg-surface border border-border text-muted hover:text-foreground shadow-sm ${
              isOwnMessage ? "-left-8" : "-right-8"
            } hidden sm:flex`}
            title="React"
          >
            <SmileIcon className="size-3.5" />
          </button>
        )}

        {/* Attached Tapback Reaction Badges */}
        {Object.keys(reactionCounts).length > 0 ? (
          <div
            onClick={() => setShowTapback(true)}
            className={`absolute -bottom-2.5 flex cursor-pointer items-center gap-0.5 rounded-full border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium shadow-md backdrop-blur-md active:scale-95 transition-transform ${
              isOwnMessage ? "right-2" : "left-2"
            }`}
          >
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <span key={emoji} className="flex items-center gap-0.5">
                <span>{emoji}</span>
                {count > 1 ? (
                  <span className="text-[10px] text-muted">{count}</span>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Timestamp */}
      {showTime ? (
        <span
          className={`mt-0.5 px-1 text-[10px] tabular-nums text-muted-foreground/60 ${
            isOwnMessage ? "text-right" : "text-left"
          }`}
        >
          {message.time}
        </span>
      ) : null}
    </div>
  );
}
