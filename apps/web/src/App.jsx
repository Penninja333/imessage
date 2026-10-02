import { WallpaperProvider } from "./context/WallpaperContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Navigate, Route, Routes } from "react-router";
import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";
import { useAuth } from "@clerk/react";
import PageLoader from "./components/PageLoader";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";

import { Toaster } from "react-hot-toast";
import {
  registerServiceWorker,
  subscribeToWebPush,
} from "./lib/notifications";
import InstallPwaBanner from "./components/InstallPwaBanner";
import UpdatePwaBanner from "./components/UpdatePwaBanner";
import PermissionsModal from "./components/PermissionsModal";
import { usePwaUpdateStore } from "./store/usePwaUpdateStore";
import { usePermissionsStore } from "./store/usePermissionsStore";
import { useChatStore } from "./store/useChatStore";

function App() {
  const { isSignedIn, isLoaded } = useAuth();

  const clearAuth = useAuthStore((state) => state.clearAuth);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);

  useEffect(() => {
    registerServiceWorker().then((reg) => {
      if (reg) {
        usePwaUpdateStore.getState().setRegistration(reg);
      }
    });

    if ("serviceWorker" in navigator) {
      const handleSwMessage = (event) => {
        if (event.data && event.data.type === "SELECT_CONVERSATION" && event.data.conversationId) {
          useChatStore.getState().setActiveConversationId(event.data.conversationId);
        }
      };

      navigator.serviceWorker.addEventListener("message", handleSwMessage);

      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          const activeId = useChatStore.getState().activeConversationId;
          if (activeId && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: "CLEAR_NOTIFICATIONS",
              senderId: activeId,
            });
          }
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      checkAuth();

      // Check notification permissions: if already granted, ensure token is registered
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        subscribeToWebPush();
      } else {
        // If not granted, prompt the user with the PermissionsModal on first start
        const hasPrompted = sessionStorage.getItem("imessage_permissions_shown_session");
        if (!hasPrompted) {
          usePermissionsStore.getState().openModal();
          sessionStorage.setItem("imessage_permissions_shown_session", "true");
        }
      }
    } else {
      clearAuth();
    }
  }, [checkAuth, clearAuth, isLoaded, isSignedIn]);

  if (!isLoaded || (isSignedIn && isCheckingAuth)) return <PageLoader />;

  return (
    <ThemeProvider>
      <WallpaperProvider>
        <Routes>
          <Route path="/" element={isSignedIn ? <ChatPage /> : <Navigate to={"/auth"} replace />} />
          <Route
            path="/auth"
            element={!isSignedIn ? <AuthPage /> : <Navigate to={"/"} replace />}
          />
        </Routes>
        <PermissionsModal />
        <InstallPwaBanner />
        <UpdatePwaBanner />
        <Toaster />
      </WallpaperProvider>
    </ThemeProvider>
  );
}

export default App;
