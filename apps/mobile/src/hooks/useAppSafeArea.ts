import { Platform, StatusBar } from "react-native";
import { useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context";

/**
 * Hook to retrieve safe area insets with robust Android status bar height fallback.
 * On Android with translucent status bar, react-native-safe-area-context often evaluates insets.top to 0.
 * This hook guarantees top/topInset is at least StatusBar.currentHeight on Android.
 */
export function useAppSafeArea(): EdgeInsets & { topInset: number } {
  const insets = useSafeAreaInsets();
  const topInset =
    Platform.OS === "android" ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : insets.top;

  return {
    ...insets,
    top: topInset,
    topInset,
  };
}

export function getTopInset(insetsTop = 0): number {
  return Platform.OS === "android" ? Math.max(insetsTop, StatusBar.currentHeight ?? 0) : insetsTop;
}
