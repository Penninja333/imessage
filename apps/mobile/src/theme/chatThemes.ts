export interface ChatThemeDefinition {
  id: string;
  name: string;
  bubbleColor: string;
  bubbleText: string;
  tintColor: string;
  bgColor?: string;
}

export const CHAT_THEMES: Record<string, ChatThemeDefinition> = {
  default: {
    id: "default",
    name: "Default",
    bubbleColor: "#007AFF",
    bubbleText: "#FFFFFF",
    tintColor: "#007AFF",
  },
  imessage: {
    id: "imessage",
    name: "iMessage 💙",
    bubbleColor: "#0A84FF",
    bubbleText: "#FFFFFF",
    tintColor: "#0A84FF",
  },
  sunset: {
    id: "sunset",
    name: "Sunset 🌅",
    bubbleColor: "#FF6B6B",
    bubbleText: "#FFFFFF",
    tintColor: "#FF6B6B",
  },
  ocean: {
    id: "ocean",
    name: "Ocean 🌊",
    bubbleColor: "#00A8FF",
    bubbleText: "#FFFFFF",
    tintColor: "#00A8FF",
  },
  love: {
    id: "love",
    name: "Love ❤️",
    bubbleColor: "#FF2D55",
    bubbleText: "#FFFFFF",
    tintColor: "#FF2D55",
  },
  forest: {
    id: "forest",
    name: "Forest 🌲",
    bubbleColor: "#34C759",
    bubbleText: "#FFFFFF",
    tintColor: "#34C759",
  },
  galaxy: {
    id: "galaxy",
    name: "Galaxy 🌌",
    bubbleColor: "#5856D6",
    bubbleText: "#FFFFFF",
    tintColor: "#5856D6",
  },
  unicorn: {
    id: "unicorn",
    name: "Unicorn 🦄",
    bubbleColor: "#AF52DE",
    bubbleText: "#FFFFFF",
    tintColor: "#AF52DE",
  },
  midnight: {
    id: "midnight",
    name: "Midnight 🌙",
    bubbleColor: "#1C1C1E",
    bubbleText: "#FFFFFF",
    tintColor: "#636366",
  },
  candy: {
    id: "candy",
    name: "Candy 🍭",
    bubbleColor: "#FF2D78",
    bubbleText: "#FFFFFF",
    tintColor: "#FF2D78",
  },
  mint: {
    id: "mint",
    name: "Mint 🍃",
    bubbleColor: "#00C7BE",
    bubbleText: "#FFFFFF",
    tintColor: "#00C7BE",
  },
  citrus: {
    id: "citrus",
    name: "Citrus 🍋",
    bubbleColor: "#FF9500",
    bubbleText: "#FFFFFF",
    tintColor: "#FF9500",
  },
  monochrome: {
    id: "monochrome",
    name: "Mono 🖤",
    bubbleColor: "#3A3A3C",
    bubbleText: "#FFFFFF",
    tintColor: "#8E8E93",
  },
  "rose-gold": {
    id: "rose-gold",
    name: "Rose Gold 🌸",
    bubbleColor: "#E0828A",
    bubbleText: "#FFFFFF",
    tintColor: "#E0828A",
  },
  tropical: {
    id: "tropical",
    name: "Tropical 🌴",
    bubbleColor: "#30D158",
    bubbleText: "#FFFFFF",
    tintColor: "#30D158",
  },
  lava: {
    id: "lava",
    name: "Lava 🔥",
    bubbleColor: "#FF3B30",
    bubbleText: "#FFFFFF",
    tintColor: "#FF3B30",
  },
  aurora: {
    id: "aurora",
    name: "Aurora 🌈",
    bubbleColor: "#64D2FF",
    bubbleText: "#000000",
    tintColor: "#64D2FF",
  },
  indigo: {
    id: "indigo",
    name: "Indigo 🌌",
    bubbleColor: "#4B0082",
    bubbleText: "#FFFFFF",
    tintColor: "#6A0DAD",
  },
  amber: {
    id: "amber",
    name: "Amber 🍯",
    bubbleColor: "#FFBF00",
    bubbleText: "#000000",
    tintColor: "#FFBF00",
  },
  cobalt: {
    id: "cobalt",
    name: "Cobalt 💎",
    bubbleColor: "#0047AB",
    bubbleText: "#FFFFFF",
    tintColor: "#0047AB",
  },
  lavender: {
    id: "lavender",
    name: "Lavender 🪻",
    bubbleColor: "#9370DB",
    bubbleText: "#FFFFFF",
    tintColor: "#9370DB",
  },
  mocha: {
    id: "mocha",
    name: "Mocha ☕",
    bubbleColor: "#6F4E37",
    bubbleText: "#FFFFFF",
    tintColor: "#8B5A2B",
  },
  sage: {
    id: "sage",
    name: "Sage 🌿",
    bubbleColor: "#77815C",
    bubbleText: "#FFFFFF",
    tintColor: "#77815C",
  },
  graphite: {
    id: "graphite",
    name: "Graphite ⚙️",
    bubbleColor: "#48484A",
    bubbleText: "#FFFFFF",
    tintColor: "#8E8E93",
  },
};

export function resolveChatTheme(themeId: string): ChatThemeDefinition {
  if (CHAT_THEMES[themeId]) {
    return CHAT_THEMES[themeId];
  }

  // Handle custom hex "custom-#123456"
  if (themeId?.startsWith("custom-#")) {
    const hex = themeId.replace("custom-", "");
    return {
      id: themeId,
      name: "Custom Color",
      bubbleColor: hex,
      bubbleText: "#FFFFFF",
      tintColor: hex,
    };
  }

  return CHAT_THEMES.default;
}
