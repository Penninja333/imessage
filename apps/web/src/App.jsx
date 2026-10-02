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
  requestNotificationPermission,
  subscribeToWebPush,
} from "./lib/notifications";
import InstallPwaBanner from "./components/InstallPwaBanner";
import UpdatePwaBanner from "./components/UpdatePwaBanner";
import { usePwaUpdateStore } from "./store/usePwaUpdateStore";

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
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      checkAuth();
      requestNotificationPermission().then((granted) => {
        if (granted) subscribeToWebPush();
      });
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
        <InstallPwaBanner />
        <UpdatePwaBanner />
        <Toaster />
      </WallpaperProvider>
    </ThemeProvider>
  );
}

export default App;
