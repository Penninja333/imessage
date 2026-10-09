import { useState, useEffect } from "react";
import { Download, X, Share2, Smartphone } from "lucide-react";

export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator?.standalone ||
      document.referrer?.includes("android-app://")
    );
  });
  const [isIOS] = useState(() => {
    if (typeof window === "undefined") return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  });
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("imessage_pwa_dismissed") === "true";
  });

  useEffect(() => {
    // Capture install prompt on Android / Chromium
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("imessage_pwa_dismissed", "true");
  };

  // Do not show if already installed as standalone or dismissed
  if (isStandalone || dismissed) {
    return null;
  }

  // Only show if we either have the install prompt (Android/Chrome) or it's iOS Safari
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#007AFF] flex items-center justify-center shadow-lg shadow-[#007AFF]/30 shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm">Install iMessage</div>
            <div className="text-xs text-zinc-400">
              {isIOS
                ? "Tap Share and 'Add to Home Screen'"
                : "Fast, full-screen mobile app"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {deferredPrompt ? (
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 rounded-full bg-[#007AFF] hover:bg-[#007AFF]/90 active:scale-95 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
          ) : isIOS ? (
            <div className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-zinc-300 flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5 text-[#007AFF]" />
              Add
            </div>
          ) : null}

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
