import { memo, useState } from "react";
import { getAppleEmojiUrl, parseEmojiSegments, getBigEmojiInfo } from "../../lib/emoji";

/**
 * Single Apple-style emoji image with automatic graceful fallback to native emoji
 */
function AppleEmojiComponent({ char, unified, size = "1.25em", className = "", style = {} }) {
  const [hasError, setHasError] = useState(false);

  if (!char && !unified) return null;

  if (hasError) {
    return (
      <span className={`inline-block select-text ${className}`} style={style}>
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
      onError={() => setHasError(true)}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: typeof size === "number" ? `${size}px` : size,
        ...style,
      }}
      className={`inline-block select-text align-[-0.2em] pointer-events-none mx-[1px] object-contain ${className}`}
      draggable={false}
    />
  );
}

export const AppleEmoji = memo(AppleEmojiComponent);

/**
 * Text component that replaces Unicode emojis with crisp Apple emojis
 */
function AppleEmojiTextComponent({ text, className = "", disableBigEmoji = false }) {
  if (!text) return null;

  // 1. Check for Apple iMessage Big Emoji mode (1 to 3 lone emojis)
  if (!disableBigEmoji) {
    const bigEmojiInfo = getBigEmojiInfo(text);
    if (bigEmojiInfo.isBigEmoji) {
      const sizeMap = { 1: 44, 2: 38, 3: 32 };
      const emojiSize = sizeMap[bigEmojiInfo.count] || 36;

      return (
        <div className={`flex flex-wrap items-center gap-1.5 py-1 ${className}`}>
          {bigEmojiInfo.emojis.map((e, idx) => (
            <AppleEmoji
              key={idx}
              char={e.value}
              unified={e.unified}
              size={emojiSize}
              className="transition-transform hover:scale-110 active:scale-95"
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
            />
          );
        }
        return <span key={idx}>{seg.value}</span>;
      })}
    </span>
  );
}

export const AppleEmojiText = memo(AppleEmojiTextComponent);
