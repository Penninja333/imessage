/**
 * Chat theme presets — shared between ChatThemePicker and useChatTheme hook.
 * Each theme defines how OWN bubbles and the chat background look.
 * All themes use clean, solid colors (no gradients) for an authentic,
 * high-contrast, modern iOS/iMessage experience.
 * "default" = use the existing app accent + wallpaper (no override).
 */
export const CHAT_THEMES = [
  {
    id: "default",
    label: "Default",
    emoji: "",
    bubbleColor: null, // null = use app accent CSS var
    bubbleText: null,
    bgStyle: null,     // null = use existing wallpaper
    swatch: "#007AFF",
  },
  {
    id: "imessage",
    label: "iMessage",
    emoji: "💙",
    bubbleColor: "#007AFF",
    bubbleText: "#ffffff",
    bgStyle: { background: "#f8fafc" },
    darkBgStyle: { background: "#090d16" },
    swatch: "#007AFF",
  },
  {
    id: "sunset",
    label: "Sunset",
    emoji: "🌅",
    bubbleColor: "#F97316",
    bubbleText: "#ffffff",
    bgStyle: { background: "#fff7ed" },
    darkBgStyle: { background: "#180c02" },
    swatch: "#F97316",
  },
  {
    id: "ocean",
    label: "Ocean",
    emoji: "🌊",
    bubbleColor: "#0284C7",
    bubbleText: "#ffffff",
    bgStyle: { background: "#f0f9ff" },
    darkBgStyle: { background: "#03131e" },
    swatch: "#0284C7",
  },
  {
    id: "love",
    label: "Love",
    emoji: "❤️",
    bubbleColor: "#E11D48",
    bubbleText: "#ffffff",
    bgStyle: { background: "#fff1f2" },
    darkBgStyle: { background: "#1c0309" },
    swatch: "#E11D48",
  },
  {
    id: "forest",
    label: "Forest",
    emoji: "🌲",
    bubbleColor: "#16A34A",
    bubbleText: "#ffffff",
    bgStyle: { background: "#f0fdf4" },
    darkBgStyle: { background: "#03140a" },
    swatch: "#16A34A",
  },
  {
    id: "galaxy",
    label: "Galaxy",
    emoji: "🌌",
    bubbleColor: "#7C3AED",
    bubbleText: "#ffffff",
    bgStyle: { background: "#f5f3ff" },
    darkBgStyle: { background: "#0d061f" },
    swatch: "#7C3AED",
  },
  {
    id: "unicorn",
    label: "Unicorn",
    emoji: "🦄",
    bubbleColor: "#A855F7",
    bubbleText: "#ffffff",
    bgStyle: { background: "#faf5ff" },
    darkBgStyle: { background: "#140620" },
    swatch: "#A855F7",
  },
  {
    id: "midnight",
    label: "Midnight",
    emoji: "🌙",
    bubbleColor: "#27272A",
    bubbleText: "#F4F4F5",
    bgStyle: { background: "#ffffff" },
    darkBgStyle: { background: "#000000" },
    swatch: "#27272A",
  },
  {
    id: "candy",
    label: "Candy",
    emoji: "🍭",
    bubbleColor: "#EC4899",
    bubbleText: "#ffffff",
    bgStyle: { background: "#fdf2f8" },
    darkBgStyle: { background: "#1a0311" },
    swatch: "#EC4899",
  },
  {
    id: "mint",
    label: "Mint",
    emoji: "🍃",
    bubbleColor: "#059669",
    bubbleText: "#ffffff",
    bgStyle: { background: "#ecfdf5" },
    darkBgStyle: { background: "#02160f" },
    swatch: "#059669",
  },
  {
    id: "citrus",
    label: "Citrus",
    emoji: "🍋",
    bubbleColor: "#65A30D",
    bubbleText: "#ffffff",
    bgStyle: { background: "#f7fee7" },
    darkBgStyle: { background: "#0d1601" },
    swatch: "#65A30D",
  },
  {
    id: "monochrome",
    label: "Mono",
    emoji: "🖤",
    bubbleColor: "#18181B",
    bubbleText: "#F4F4F5",
    bgStyle: { background: "#f4f4f5" },
    darkBgStyle: { background: "#09090b" },
    swatch: "#18181B",
  },
  {
    id: "rose-gold",
    label: "Rose Gold",
    emoji: "🌸",
    bubbleColor: "#FB7185",
    bubbleText: "#ffffff",
    bgStyle: { background: "#fff1f5" },
    darkBgStyle: { background: "#1c040d" },
    swatch: "#FB7185",
  },
  {
    id: "tropical",
    label: "Tropical",
    emoji: "🌴",
    bubbleColor: "#0D9488",
    bubbleText: "#ffffff",
    bgStyle: { background: "#f0fdfa" },
    darkBgStyle: { background: "#021614" },
    swatch: "#0D9488",
  },
  {
    id: "lava",
    label: "Lava",
    emoji: "🔥",
    bubbleColor: "#DC2626",
    bubbleText: "#ffffff",
    bgStyle: { background: "#fef2f2" },
    darkBgStyle: { background: "#190303" },
    swatch: "#DC2626",
  },
  {
    id: "aurora",
    label: "Aurora",
    emoji: "🌈",
    bubbleColor: "#0891B2",
    bubbleText: "#ffffff",
    bgStyle: { background: "#ecfeff" },
    darkBgStyle: { background: "#02151b" },
    swatch: "#0891B2",
  },
  {
    id: "indigo",
    label: "Indigo",
    emoji: "🌌",
    bubbleColor: "#4F46E5",
    bubbleText: "#ffffff",
    bgStyle: { background: "#eef2ff" },
    darkBgStyle: { background: "#0a0c24" },
    swatch: "#4F46E5",
  },
  {
    id: "amber",
    label: "Amber",
    emoji: "🍯",
    bubbleColor: "#D97706",
    bubbleText: "#ffffff",
    bgStyle: { background: "#fffbeb" },
    darkBgStyle: { background: "#170f01" },
    swatch: "#D97706",
  },
  {
    id: "cobalt",
    label: "Cobalt",
    emoji: "💎",
    bubbleColor: "#1D4ED8",
    bubbleText: "#ffffff",
    bgStyle: { background: "#eff6ff" },
    darkBgStyle: { background: "#051126" },
    swatch: "#1D4ED8",
  },
  {
    id: "lavender",
    label: "Lavender",
    emoji: "🪻",
    bubbleColor: "#8B5CF6",
    bubbleText: "#ffffff",
    bgStyle: { background: "#f5f3ff" },
    darkBgStyle: { background: "#110a26" },
    swatch: "#8B5CF6",
  },
  {
    id: "mocha",
    label: "Mocha",
    emoji: "☕",
    bubbleColor: "#78350F",
    bubbleText: "#ffffff",
    bgStyle: { background: "#fffbeb" },
    darkBgStyle: { background: "#140902" },
    swatch: "#78350F",
  },
  {
    id: "sage",
    label: "Sage",
    emoji: "🌿",
    bubbleColor: "#4D7C0F",
    bubbleText: "#ffffff",
    bgStyle: { background: "#f7fee7" },
    darkBgStyle: { background: "#091202" },
    swatch: "#4D7C0F",
  },
  {
    id: "graphite",
    label: "Graphite",
    emoji: "⚙️",
    bubbleColor: "#3F3F46",
    bubbleText: "#FAFAFA",
    bgStyle: { background: "#f4f4f5" },
    darkBgStyle: { background: "#121215" },
    swatch: "#3F3F46",
  },
];

export const DEFAULT_THEME = CHAT_THEMES[0];

export function getThemeById(id) {
  if (id && typeof id === "string" && id.startsWith("custom-#")) {
    const hex = id.slice(7);
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      const fullHex = `#${hex.toLowerCase()}`;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      // Relative luminance for contrast
      const lum = (r * 299 + g * 587 + b * 114) / 1000;
      const bubbleText = lum > 165 ? "#18181b" : "#ffffff";

      return {
        id,
        label: `Custom (${fullHex.toUpperCase()})`,
        emoji: "🎨",
        bubbleColor: fullHex,
        bubbleText,
        bgStyle: { background: `rgba(${r}, ${g}, ${b}, 0.05)` },
        darkBgStyle: {
          background: `rgba(${Math.floor(r * 0.12)}, ${Math.floor(g * 0.12)}, ${Math.floor(b * 0.12)}, 0.95)`,
        },
        swatch: fullHex,
      };
    }
  }

  return CHAT_THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}

