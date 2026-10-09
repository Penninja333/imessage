import { memo, useState, useCallback } from "react";
import { getAppleEmojiUrl, parseEmojiSegments, getBigEmojiInfo } from "../../lib/emoji";
import { triggerEmojiBurst } from "../../lib/emojiBurst";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";

/**
 * Single Apple-style emoji image with automatic graceful fallback to native emoji
 * and interactive tap animation + particle burst emission
 */
function AppleEmojiComponent({
  char,
  unified,
  size = "1.25em",
  className = "",
  style = {},
  interactive = false,
  onClick,
}) {
  const [hasError, setHasError] = useState(false);
  const [isPopping, setIsPopping] = useState(false);

  const handleClick = useCallback(
    (e) => {
      if (!interactive) {
        if (onClick) onClick(e);
        return;
      }

      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // 1. Pop spring animation
      setIsPopping(true);
      setTimeout(() => setIsPopping(false), 260);

      // 2. Trigger local particle burst
      triggerEmojiBurst({
        emoji: char || "✨",
        x: centerX,
        y: centerY,
        isRemote: false,
      });

      // 3. Sync to partner in active conversation via socket
      const socket = useAuthStore.getState().socket;
      const activeId = useChatStore.getState().activeConversationId;
      if (socket?.connected && activeId) {
        socket.emit("emojiBurst", {
          receiverId: activeId,
          emoji: char || "✨",
          x: centerX / window.innerWidth,
          y: centerY / window.innerHeight,
        });
      }

      if (onClick) onClick(e);
    },
    [char, interactive, onClick],
  );

  if (!char && !unified) return null;

  if (hasError) {
    return (
      <span
        onClick={interactive ? handleClick : onClick}
        className={`inline-block select-text ${
          interactive
            ? "cursor-pointer transition-transform duration-150 hover:scale-125 active:scale-95"
            : onClick
              ? "cursor-pointer pointer-events-auto"
              : "pointer-events-none"
        } ${isPopping ? "scale-140 -rotate-6 transition-transform duration-150" : ""} ${className}`}
        style={style}
      >
        {char}
      </span>
    );
  }

  const src = getAppleEmojiUrl(unified || char);

  return (
    <img
      src={src}
      alt={char || ""}
      loading="lazy"
      decoding="async"
      onClick={interactive ? handleClick : onClick}
      onError={() => setHasError(true)}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: typeof size === "number" ? `${size}px` : size,
        ...style,
      }}
      className={`inline-block select-text align-[-0.2em] mx-[1px] object-contain transition-all duration-150 ${
        interactive
          ? "cursor-pointer hover:scale-125 active:scale-95 touch-manipulation pointer-events-auto"
          : onClick
            ? "cursor-pointer pointer-events-auto"
            : "pointer-events-none"
      } ${
        isPopping
          ? "scale-140 -rotate-6 transition-transform duration-150 shadow-sm filter drop-shadow-md"
          : ""
      } ${className}`}
      draggable={false}
    />
  );
}

export const AppleEmoji = memo(AppleEmojiComponent);

/**
 * Text component that replaces Unicode emojis with crisp Apple emojis
 */
function AppleEmojiTextComponent({
  text,
  className = "",
  disableBigEmoji = false,
  interactive,
}) {
  if (!text) return null;

  const isInteractive = interactive !== undefined ? interactive : !disableBigEmoji;

  // 1. Check for Apple iMessage Big Emoji mode (1 to 3 lone emojis)
  if (!disableBigEmoji) {
    const bigEmojiInfo = getBigEmojiInfo(text);
    if (bigEmojiInfo.isBigEmoji) {
      const sizeMap = { 1: 46, 2: 40, 3: 34 };
      const emojiSize = sizeMap[bigEmojiInfo.count] || 38;

      return (
        <div className={`flex flex-wrap items-center gap-2 py-1.5 ${className}`}>
          {bigEmojiInfo.emojis.map((e, idx) => (
            <AppleEmoji
              key={idx}
              char={e.value}
              unified={e.unified}
              size={emojiSize}
              interactive={isInteractive}
              className="hover:scale-125 active:scale-95 transition-transform duration-200"
            />
          ))}
        </div>
      );
    }
  }

  // 2. Standard inline text rendering
  const segments = parseEmojiSegments(text);

  return (
    <span className={`inline break-words ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === "emoji") {
          return (
            <AppleEmoji
              key={idx}
              char={seg.value}
              unified={seg.unified}
              interactive={isInteractive}
            />
          );
        }
        return <span key={idx}>{seg.value}</span>;
      })}
    </span>
  );
}

export const AppleEmojiText = memo(AppleEmojiTextComponent);
