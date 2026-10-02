import { create } from "zustand";
import toast from "react-hot-toast";

export const usePwaUpdateStore = create((set, get) => ({
  registration: null,
  needRefresh: false,
  isChecking: false,
  dismissed: false,

  setRegistration: (registration) => {
    set({ registration });

    if (!registration) return;

    // If there is already a waiting worker on registration, an update is ready
    if (registration.waiting) {
      set({ needRefresh: true });
    }

    // Listen for future updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        // If the new worker is installed and there's already an active controller,
        // it means an updated version is waiting to activate
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker &&
          navigator.serviceWorker.controller
        ) {
          set({ needRefresh: true, dismissed: false });
          toast("A new version of iMessage is ready!", {
            icon: "🚀",
            duration: 6000,
          });
        }
      });
    });

    // When the new worker takes control (via skipWaiting), reload to fresh code
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  },

  checkForUpdate: async (isManual = true) => {
    if (!("serviceWorker" in navigator)) {
      if (isManual) toast.error("PWA updates not supported in this browser");
      return;
    }

    set({ isChecking: true });

    try {
      let reg = get().registration;
      if (!reg) {
        reg = await navigator.serviceWorker.getRegistration();
        if (reg) set({ registration: reg });
      }

      if (!reg) {
        if (isManual) toast.error("No active service worker found");
        return;
      }

      // Check if an update is already waiting
      if (reg.waiting) {
        set({ needRefresh: true, dismissed: false });
        if (isManual) {
          toast.success("An update is ready to install!");
        }
        return;
      }

      // Request browser to check the server for sw.js updates
      await reg.update();

      // Wait a brief moment for updatefound / installing state to propagate
      await new Promise((r) => setTimeout(r, 1200));

      if (reg.waiting) {
        set({ needRefresh: true, dismissed: false });
        if (isManual) {
          toast.success("New update found and ready to install!");
        }
      } else if (reg.installing) {
        if (isManual) {
          toast("Downloading update in the background...", { icon: "⏳" });
        }
      } else {
        if (isManual) {
          toast.success("You're using the latest version of iMessage!", {
            icon: "✨",
          });
        }
      }
    } catch (err) {
      console.warn("PWA update check failed:", err);
      if (isManual) {
        toast.error("Could not check for updates. Check connection.");
      }
    } finally {
      set({ isChecking: false });
    }
  },

  updateApp: () => {
    const reg = get().registration;
    if (reg && reg.waiting) {
      // Send SKIP_WAITING to waiting worker
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      // Fallback reload
      window.location.reload();
    }
  },

  dismissUpdate: () => set({ dismissed: true }),
}));
