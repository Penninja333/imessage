import { useState, useRef, useEffect, memo } from "react";
import { withTransform } from "../../lib/imagekit";
import { MessageVideo } from "./MessageVideo";
import { MessageAudio } from "./MessageAudio";
import { CopyIcon, SparklesIcon, Trash2Icon, SmileIcon, Maximize2 } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useMediaViewerStore } from "../../store/useMediaViewerStore";
import { formatMessageTime } from "../../lib/utils";
import toast from "react-hot-toast";

// Compress + size images for the bubble (q-auto works for images; f-auto picks WebP/AVIF).
const IMAGE_TRANSFORM = "q-auto,w-640,f-auto";

const TAPBACK_EMOJIS = ["❤️", "👍", "👎", "😂", "‼️", "❓"];

function MessageBubbleComponent({ message, showTime = true }) {
  const toggleReaction = useChatStore((state) => state.toggleReaction);
  const deleteMessage = useChatStore((state) => state.deleteMessage);

  const [showTapback, setShowTapback] = useState(false);
  const longPressTimerRef = useRef(null);
  const isLongPressRef = useRef(false);
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
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
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

  const handleOpenMedia = (mediaType) => {
    if (isLongPressRef.current) return;

    const chatState = useChatStore.getState();
    const rawMessages = chatState.messages || [];
    const authUser = useAuthStore.getState().authUser;
    const myId = authUser?._id ? String(authUser._id) : "";

    const activePartner =
      chatState.users.find((u) => String(u._id) === String(chatState.activeConversationId)) ||
      chatState.conversations.find((c) => String(c._id) === String(chatState.activeConversationId));
    const peerName = activePartner?.nickname || activePartner?.fullName || "Friend";

    const mediaList = rawMessages
      .filter((m) => !m.deleted && (m.image || m.video))
      .map((m) => {
        const isMine = String(m.senderId) === String(myId);
        return {
          id: String(m._id),
          type: m.image ? "image" : "video",
          url: m.image || m.video,
          text: m.text || "",
          time: formatMessageTime(m.createdAt),
          senderName: isMine ? "You" : peerName,
        };
      });

    const currentItem = {
      id: String(message.id),
      type: mediaType || (hasImage ? "image" : "video"),
      url: mediaType === "video" ? message.videoUrl : message.imageUrl,
      text: message.text || "",
      time: message.time || "",
      senderName: isOwnMessage ? "You" : peerName,
    };

    useMediaViewerStore.getState().openMedia({
      media: currentItem,
      mediaList,
    });
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

          {hasImage || hasVideo ? (
            <button
              type="button"
              onClick={() => {
                setShowTapback(false);
                handleOpenMedia(hasImage ? "image" : "video");
              }}
              className="flex size-7 items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-surface transition"
              title="View Fullscreen"
            >
              <Maximize2 className="size-3.5" />
            </button>
          ) : null}

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
          <div
            className="group/img relative mb-1.5 cursor-pointer overflow-hidden rounded-lg sm:rounded-xl active:scale-[0.99] transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenMedia("image");
            }}
          >
            <img
              src={withTransform(message.imageUrl, IMAGE_TRANSFORM)}
              alt={message.text || "Photo"}
              loading="lazy"
              className="max-h-48 max-w-full rounded-lg object-cover sm:max-h-56 sm:rounded-xl"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover/img:bg-black/15 pointer-events-none" />
            <div className="absolute top-2 right-2 hidden sm:flex size-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs opacity-0 transition-opacity group-hover/img:opacity-100 pointer-events-none shadow-sm">
              <Maximize2 className="size-3.5" />
            </div>
          </div>
        ) : null}

        {hasVideo ? (
          <MessageVideo
            src={message.videoUrl}
            onOpenFullscreen={() => handleOpenMedia("video")}
          />
        ) : null}
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

      {/* Timestamp & Delivery/Seen Status */}
      {showTime ? (
        <div
          className={`mt-0.5 flex items-center gap-1 px-1 text-[10px] tabular-nums text-muted-foreground/60 ${
            isOwnMessage ? "justify-end text-right" : "justify-start text-left"
          }`}
        >
          <span>{message.time}</span>
          {isOwnMessage && !message.isSystem && (
            <span
              className={message.seen ? "text-accent font-semibold" : "opacity-60"}
              title={message.seen ? "Read" : "Delivered"}
            >
              {message.seen ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function arePropsEqual(prevProps, nextProps) {
  if (prevProps.showTime !== nextProps.showTime) return false;
  const pm = prevProps.message;
  const nm = nextProps.message;
  if (pm === nm) return true;
  if (!pm || !nm) return false;

  return (
    pm.id === nm.id &&
    pm.text === nm.text &&
    pm.time === nm.time &&
    pm.seen === nm.seen &&
    pm.deleted === nm.deleted &&
    pm.imageUrl === nm.imageUrl &&
    pm.videoUrl === nm.videoUrl &&
    pm.audioUrl === nm.audioUrl &&
    pm.role === nm.role &&
    (pm.reactions === nm.reactions ||
      (Array.isArray(pm.reactions) &&
        Array.isArray(nm.reactions) &&
        pm.reactions.length === nm.reactions.length &&
        pm.reactions.every(
          (r, i) =>
            r.emoji === nm.reactions[i]?.emoji &&
            String(r.userId) === String(nm.reactions[i]?.userId),
        )))
  );
}

export const MessageBubble = memo(MessageBubbleComponent, arePropsEqual);
