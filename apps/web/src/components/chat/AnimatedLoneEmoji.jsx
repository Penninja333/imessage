import { memo } from "react";
import { AppleEmoji } from "../common/AppleEmoji";

/**
 * 4-Point Golden Sparkling Star SVG
 */
function SparkleStar({ className = "", style = {}, size = 16, color = "#FFD700" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`pointer-events-none absolute select-none ${className}`}
      style={style}
    >
      {/* Outer star glow */}
      <path
        d="M12 0C12 7.5 14.5 10 22 12C14.5 14 12 16.5 12 24C12 16.5 9.5 14 2 12C9.5 10 12 7.5 12 0Z"
        fill={color}
      />
      {/* Inner white highlight */}
      <path
        d="M12 5C12 9 13.5 10.5 17.5 12C13.5 13.5 12 15 12 19C12 15 10.5 13.5 6.5 12C10.5 10.5 12 9 12 5Z"
        fill="#FFFFFF"
        opacity={0.85}
      />
    </svg>
  );
}

/**
 * Floating Heart SVG
 */
function FloatingMiniHeart({ className = "", style = {}, size = 15, color = "#FF2D55" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={`pointer-events-none absolute select-none ${className}`}
      style={style}
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

/**
 * Tear Droplet SVG
 */
function TearDroplet({ className = "", style = {}, size = 11, color = "#38BDF8" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={`pointer-events-none absolute select-none ${className}`}
      style={style}
    >
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

/**
 * Animated Lone Emoji component for single-emoji messages (iMessage style)
 */
function AnimatedLoneEmojiComponent({ emoji, unified, size = 64 }) {
  if (!emoji && !unified) return null;

  const char = emoji || "";
  const isStar = /^[⭐🌟✨💫]$/u.test(char);
  const isHeart = /^[❤️💖💕💘💓💗💞🥰😍]$/u.test(char);
  const isFire = /^[🔥]$/u.test(char);
  const isParty = /^[🎉🥳🎊🍾]$/u.test(char);
  const isTears = /^[😂😭🤣🥺]$/u.test(char);
  const isWave = /^[👋]$/u.test(char);

  let animationClass = "animate-lone-emoji-float";
  if (isStar) animationClass = "animate-star-gleam";
  else if (isHeart) animationClass = "animate-heartbeat";
  else if (isFire) animationClass = "animate-flame-flicker";
  else if (isParty) animationClass = "animate-party-wiggle";
  else if (isTears) animationClass = "animate-laugh-shake";
  else if (isWave) animationClass = "animate-wave-hand";

  return (
    <div className="relative inline-flex items-center justify-center p-3 select-none animate-emoji-entrance">
      {/* ─── Specialized Ambient Animated Overlays ────────────────────── */}

      {/* 1. Star ambient animated twinkling stars */}
      {isStar && (
        <>
          {/* Top Right Sparkle */}
          <SparkleStar
            size={18}
            className="animate-star-twinkle-a -top-1 -right-2"
            color="#FFD700"
          />
          {/* Top Left Sparkle */}
          <SparkleStar
            size={14}
            className="animate-star-twinkle-b top-1 -left-2"
            color="#FFE066"
          />
          {/* Bottom Left Sparkle */}
          <SparkleStar
            size={16}
            className="animate-star-twinkle-c -bottom-1 -left-1"
            color="#FFC107"
          />
          {/* Bottom Right Sparkle */}
          <SparkleStar
            size={13}
            className="animate-star-twinkle-a bottom-2 -right-3"
            color="#FFF4A3"
          />
          {/* Top Center Shimmer */}
          <SparkleStar
            size={11}
            className="animate-star-twinkle-b -top-3 left-6"
            color="#FFFFFF"
          />
        </>
      )}

      {/* 2. Heart floating mini-hearts */}
      {isHeart && (
        <>
          <FloatingMiniHeart
            size={16}
            className="animate-heart-float-a top-0 -left-2"
            color="#FF2D55"
          />
          <FloatingMiniHeart
            size={14}
            className="animate-heart-float-b top-1 -right-2"
            color="#FF375F"
          />
        </>
      )}

      {/* 3. Fire rising ember sparks */}
      {isFire && (
        <>
          <span className="pointer-events-none absolute -top-1 left-4 size-2 rounded-full bg-amber-400 animate-ember-a" />
          <span className="pointer-events-none absolute top-1 right-4 size-2.5 rounded-full bg-orange-500 animate-ember-b" />
          <span className="pointer-events-none absolute -top-3 left-7 size-1.5 rounded-full bg-yellow-300 animate-ember-a" />
        </>
      )}

      {/* 4. Party confetti ribbons */}
      {isParty && (
        <>
          <span className="pointer-events-none absolute -top-2 -left-2 size-2.5 rounded-sm bg-pink-500 animate-star-twinkle-a" />
          <span className="pointer-events-none absolute top-0 -right-2 size-2 rounded-sm bg-cyan-400 animate-star-twinkle-b" />
          <span className="pointer-events-none absolute -bottom-1 left-1 size-2 rounded-full bg-amber-400 animate-star-twinkle-c" />
        </>
      )}

      {/* 5. Laughing / crying tear droplets */}
      {isTears && (
        <>
          <TearDroplet size={13} className="animate-tear-left top-4 -left-1" />
          <TearDroplet size={13} className="animate-tear-right top-4 -right-1" />
        </>
      )}

      {/* ─── Main Animated Emoji ─────────────────────────────────────── */}
      <div className={`${animationClass} transition-transform`}>
        <AppleEmoji
          char={char}
          unified={unified}
          size={size}
          interactive={true}
          className="filter drop-shadow-md hover:scale-125 active:scale-95 transition-transform duration-200 cursor-pointer"
        />
      </div>
    </div>
  );
}

export const AnimatedLoneEmoji = memo(AnimatedLoneEmojiComponent);
