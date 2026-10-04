import { useChatStore } from "../store/useChatStore";
import { useTheme } from "../context/theme";
import { getThemeById } from "../data/chatThemes";

/**
 * Returns the active theme object for a given conversation partner.
 * Also provides the resolved bgStyle based on current light/dark mode.
 */
export function useChatTheme(partnerId) {
  const { theme: colorMode } = useTheme(); // "light" | "dark"
  const themeId = useChatStore(
    (s) => (partnerId ? (s.conversationThemes[String(partnerId)] ?? "default") : "default"),
  );

  const theme = getThemeById(themeId);

  // Pick dark or light background depending on current colour mode
  const resolvedBgStyle =
    colorMode === "dark" && theme.darkBgStyle ? theme.darkBgStyle : (theme.bgStyle ?? null);

  return { theme, resolvedBgStyle, themeId };
}
