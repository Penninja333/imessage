// Apple Emoji Utilities — converts Unicode emojis into authentic Apple Emoji CDN image assets

const CDN_BASE = "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64";

// Explicit overrides for emojis that use or don't use variation selectors
const UNIFIED_OVERRIDES = {
  "❤️": "2764-fe0f",
  "‼️": "203c-fe0f",
  "⁉️": "2049-fe0f",
  "❓": "2753",
  "❕": "2755",
  "✔️": "2714-fe0f",
  "✨": "2728",
  "⭐": "2b50",
  "⚡": "26a1",
  "☀️": "2600-fe0f",
  "☁️": "2601-fe0f",
  "☕": "2615",
  "⚠️": "26a0-fe0f",
  "⚓": "2693",
};

/**
 * Converts a Unicode emoji string into a lowercase hex unified string (e.g. "1f600" or "2764-fe0f")
 */
export function emojiToUnified(emoji) {
  if (!emoji) return "";
  if (UNIFIED_OVERRIDES[emoji]) {
    return UNIFIED_OVERRIDES[emoji];
  }

  // Strip trailing variation selector-16 (\ufe0f) unless it's in UNIFIED_OVERRIDES
  const cleaned = emoji.replace(/\ufe0f/g, "");

  // Convert each Unicode code point to hex
  return [...cleaned]
    .map((c) => c.codePointAt(0).toString(16).toLowerCase())
    .join("-");
}

/**
 * Returns the CDN image URL for an Apple-style emoji
 */
export function getAppleEmojiUrl(emojiOrUnified) {
  if (!emojiOrUnified) return "";
  const unified = emojiOrUnified.includes("-") || /^[0-9a-f]{4,6}$/i.test(emojiOrUnified)
    ? emojiOrUnified.toLowerCase()
    : emojiToUnified(emojiOrUnified);

  return `${CDN_BASE}/${unified}.png`;
}

// Regex to check if a grapheme is an emoji (excluding numbers, symbols like #, *, 0-9)
const EMOJI_TEST_REGEX = /\p{Extended_Pictographic}/u;
const NON_EMOJI_SYMBOLS = new Set(["#", "*", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "©", "®", "™"]);

export function isEmojiChar(str) {
  if (!str || NON_EMOJI_SYMBOLS.has(str.trim())) return false;
  return EMOJI_TEST_REGEX.test(str);
}

// Segmenter instance for grapheme clustering
let segmenter = null;
function getSegmenter() {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    if (!segmenter) {
      segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    }
    return segmenter;
  }
  return null;
}

// Simple in-memory LRU cache to prevent re-tokenizing identical short messages
const parseCache = new Map();
const MAX_CACHE_SIZE = 250;

/**
 * Parses mixed text into an array of segments:
 * [{ type: "text", value: "Hello " }, { type: "emoji", value: "😀", unified: "1f600" }]
 */
export function parseEmojiSegments(text) {
  if (!text) return [];
  if (parseCache.has(text)) {
    return parseCache.get(text);
  }

  const segments = [];
  const seg = getSegmenter();

  if (seg) {
    let currentText = "";

    for (const { segment } of seg.segment(text)) {
      if (isEmojiChar(segment)) {
        if (currentText) {
          segments.push({ type: "text", value: currentText });
          currentText = "";
        }
        segments.push({
          type: "emoji",
          value: segment,
          unified: emojiToUnified(segment),
        });
      } else {
        currentText += segment;
      }
    }

    if (currentText) {
      segments.push({ type: "text", value: currentText });
    }
  } else {
    // Fallback for older environments without Intl.Segmenter
    segments.push({ type: "text", value: text });
  }

  if (parseCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entries
    const firstKey = parseCache.keys().next().value;
    if (firstKey) parseCache.delete(firstKey);
  }
  parseCache.set(text, segments);

  return segments;
}

/**
 * Checks if the message consists strictly of 1 to 3 emojis and no other text.
 * Authentic Apple iMessage displays 1-3 emojis in large size!
 */
export function getBigEmojiInfo(text) {
  if (!text || typeof text !== "string") {
    return { isBigEmoji: false, emojis: [] };
  }

  const trimmed = text.trim();
  const segments = parseEmojiSegments(trimmed);

  // Filter out whitespace-only text segments
  const emojiSegments = [];
  for (const s of segments) {
    if (s.type === "emoji") {
      emojiSegments.push(s);
    } else if (s.value.trim().length > 0) {
      // Contains non-emoji words or characters
      return { isBigEmoji: false, emojis: [] };
    }
  }

  if (emojiSegments.length >= 1 && emojiSegments.length <= 3) {
    return {
      isBigEmoji: true,
      count: emojiSegments.length,
      emojis: emojiSegments,
    };
  }

  return { isBigEmoji: false, emojis: [] };
}
