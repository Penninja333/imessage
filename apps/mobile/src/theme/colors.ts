export interface ChatThemePreset {
  id: string;
  label: string;
  emoji: string;
  bubbleColor: string | null;
  bubbleText: string | null;
  bgLight: string | null;
  bgDark: string | null;
  swatch: string;
}

export const CHAT_THEMES: ChatThemePreset[] = [
  {
    id: "default",
    label: "Default",
    emoji: "",
    bubbleColor: null,
    bubbleText: null,
    bgLight: null,
    bgDark: null,
    swatch: "#007AFF",
  },
  {
    id: "imessage",
    label: "iMessage",
    emoji: "💙",
    bubbleColor: "#007AFF",
    bubbleText: "#ffffff",
    bgLight: "#f8fafc",
    bgDark: "#090d16",
    swatch: "#007AFF",
  },
  {
    id: "sunset",
    label: "Sunset",
    emoji: "🌅",
    bubbleColor: "#F97316",
    bubbleText: "#ffffff",
    bgLight: "#fff7ed",
    bgDark: "#180c02",
    swatch: "#F97316",
  },
  {
    id: "ocean",
    label: "Ocean",
    emoji: "🌊",
    bubbleColor: "#0284C7",
    bubbleText: "#ffffff",
    bgLight: "#f0f9ff",
    bgDark: "#03131e",
    swatch: "#0284C7",
  },
  {
    id: "love",
    label: "Love",
    emoji: "❤️",
    bubbleColor: "#E11D48",
    bubbleText: "#ffffff",
    bgLight: "#fff1f2",
    bgDark: "#1c0309",
    swatch: "#E11D48",
  },
  {
    id: "forest",
    label: "Forest",
    emoji: "🌲",
    bubbleColor: "#16A34A",
    bubbleText: "#ffffff",
    bgLight: "#f0fdf4",
    bgDark: "#031709",
    swatch: "#16A34A",
  },
  {
    id: "lavender",
    label: "Lavender",
    emoji: "🪻",
    bubbleColor: "#9333EA",
    bubbleText: "#ffffff",
    bgLight: "#faf5ff",
    bgDark: "#13051f",
    swatch: "#9333EA",
  },
  {
    id: "midnight",
    label: "Midnight",
    emoji: "🌌",
    bubbleColor: "#475569",
    bubbleText: "#ffffff",
    bgLight: "#f8fafc",
    bgDark: "#050811",
    swatch: "#475569",
  },
];

export const SYSTEM_COLORS = {
  light: {
    background: "#FFFFFF",
    surface: "#F2F2F7",
    surfaceElevated: "#E5E5EA",
    border: "#C6C6C8",
    text: "#000000",
    textMuted: "#8E8E93",
    accent: "#007AFF",
    bubbleIncoming: "#E9E9EB",
    bubbleIncomingText: "#000000",
  },
  dark: {
    background: "#000000",
    surface: "#1C1C1E",
    surfaceElevated: "#2C2C2E",
    border: "#38383A",
    text: "#FFFFFF",
    textMuted: "#8E8E93",
    accent: "#0A84FF",
    bubbleIncoming: "#26252A",
    bubbleIncomingText: "#FFFFFF",
  },
};
