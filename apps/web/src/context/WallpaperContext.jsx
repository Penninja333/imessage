import { useEffect, useState, useMemo } from "react";
import { frameStyleFromUrl, getWallpaperById } from "../data/wallpapers";
import { WallpaperContext } from "./wallpaper";
import { useChatStore } from "../store/useChatStore";

const STORAGE_KEY = "chat-wallpaper-id";

function readStoredWallpaperId() {
  const wallpaperId = localStorage.getItem(STORAGE_KEY);
  if (wallpaperId) return wallpaperId;

  return "sonoma-horizon";
}

export function WallpaperProvider({ children }) {
  const [defaultWallpaperId, setDefaultWallpaperIdState] = useState(readStoredWallpaperId);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const conversationWallpapers = useChatStore((state) => state.conversationWallpapers);
  const setConversationWallpaper = useChatStore((state) => state.setConversationWallpaper);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, defaultWallpaperId);
  }, [defaultWallpaperId]);

  // If inside an active conversation, resolve its shared wallpaper if chosen, falling back to default
  const activeConvoWallpaper =
    activeConversationId ? conversationWallpapers[String(activeConversationId)] : null;
  const effectiveWallpaperId = activeConvoWallpaper || defaultWallpaperId;

  const wallpaper = useMemo(() => getWallpaperById(effectiveWallpaperId), [effectiveWallpaperId]);
  const frameStyle = useMemo(() => frameStyleFromUrl(wallpaper?.url), [wallpaper]);

  const setWallpaperId = (id, targetPartnerId) => {
    const partnerId = targetPartnerId || activeConversationId;
    if (partnerId) {
      setConversationWallpaper(String(partnerId), id);
    }
    setDefaultWallpaperIdState(id);
  };

  return (
    <WallpaperContext.Provider
      value={{
        wallpaperId: effectiveWallpaperId,
        defaultWallpaperId,
        setWallpaperId,
        wallpaper,
        frameStyle,
      }}
    >
      {children}
    </WallpaperContext.Provider>
  );
}
