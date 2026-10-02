import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  BellRing,
  Mic,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { usePermissionsStore } from "../store/usePermissionsStore";
import { subscribeToWebPush } from "../lib/notifications";
import toast from "react-hot-toast";

export default function PermissionsModal() {
  const isOpen = usePermissionsStore((state) => state.isOpen);
  const closeModal = usePermissionsStore((state) => state.closeModal);

  const [notificationStatus, setNotificationStatus] = useState("default");
  const [micStatus, setMicStatus] = useState("prompt");
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  const [isEnablingMic, setIsEnablingMic] = useState(false);

  // Check initial permissions
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationStatus(Notification.permission);
    } else {
      setNotificationStatus("unsupported");
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" })
        .then((res) => {
          setMicStatus(res.state);
          res.onchange = () => setMicStatus(res.state);
        })
        .catch(() => {
          if (localStorage.getItem("imessage_mic_granted") === "true") {
            setMicStatus("granted");
          }
        });
    } else if (localStorage.getItem("imessage_mic_granted") === "true") {
      setMicStatus("granted");
    }
  }, [isOpen]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("Notifications are not supported in this browser");
      return;
    }

    setIsEnablingNotifications(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);

      if (permission === "granted") {
        toast.success("Notifications allowed! Registering banner alerts...");
        const subscribed = await subscribeToWebPush();
        if (subscribed) {
          toast.success("Notification banners active!");
        }
      } else if (permission === "denied") {
        toast.error("Notifications blocked in browser settings");
      }
    } catch (err) {
      console.error("Error requesting notifications:", err);
      toast.error("Failed to enable notifications");
    } finally {
      setIsEnablingNotifications(false);
    }
  };

  const handleEnableMic = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone access is not supported in this browser");
      return;
    }

    setIsEnablingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus("granted");
      localStorage.setItem("imessage_mic_granted", "true");
      toast.success("Microphone enabled for voice messages!");
    } catch (err) {
      console.error("Error requesting microphone:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicStatus("denied");
        toast.error("Microphone blocked in browser settings");
      } else {
        toast.error("Could not access microphone");
      }
    } finally {
      setIsEnablingMic(false);
    }
  };

  const handleEnableAll = async () => {
    if (notificationStatus !== "granted") {
      await handleEnableNotifications();
    }
    if (micStatus !== "granted") {
      await handleEnableMic();
    }
  };

  const allGranted = notificationStatus === "granted" && micStatus === "granted";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:justify-center md:items-center bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={closeModal} aria-hidden />

      {/* Modal sheet */}
      <div className="relative z-10 flex w-full flex-col overflow-hidden border-border bg-background text-foreground shadow-2xl transition-all md:max-w-md md:rounded-3xl md:border max-h-[92dvh] rounded-t-3xl border-t pb-[max(1.2rem,env(safe-area-inset-bottom))] md:pb-6 animate-in slide-in-from-bottom duration-250">
        {/* Mobile drag handle */}
        <div className="flex w-full justify-center pt-3 pb-1 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-muted/30" />
        </div>

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <ShieldCheck className="size-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">App Permissions</h3>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground transition"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
          <div className="text-center pt-1 pb-2">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-2 ring-1 ring-accent/20">
              <Sparkles className="size-7" />
            </div>
            <h4 className="text-lg font-bold text-foreground">Stay Connected</h4>
            <p className="text-xs text-muted max-w-xs mx-auto mt-1 leading-relaxed">
              Enable notifications to get banner alerts over other apps like Instagram, and microphone for voice messages.
            </p>
          </div>

          {/* Card 1: Push Notifications */}
          <div className="rounded-2xl border border-border/70 bg-surface/60 p-4 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent mt-0.5">
                  <BellRing className="size-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-foreground">
                    Notification Banners
                  </h5>
                  <p className="text-xs text-muted/90 mt-0.5 leading-relaxed">
                    Pops up message banners when friends text you, even while using other apps (like Instagram) or with phone screen locked.
                  </p>
                </div>
              </div>

              {notificationStatus === "granted" ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                  <CheckCircle2 className="size-3.5" />
                  Allowed
                </span>
              ) : null}
            </div>

            {notificationStatus === "denied" ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-danger/10 p-2.5 text-xs text-danger">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  Blocked in browser. Tap 🔒 in your address bar &gt; Permissions &gt; turn on <b>Notifications</b>.
                </p>
              </div>
            ) : notificationStatus !== "granted" ? (
              <button
                type="button"
                onClick={handleEnableNotifications}
                disabled={isEnablingNotifications}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-accent-foreground shadow-sm hover:brightness-105 active:scale-98 transition"
              >
                {isEnablingNotifications ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <BellRing className="size-4" />
                )}
                <span>{isEnablingNotifications ? "Enabling..." : "Allow Notifications"}</span>
              </button>
            ) : null}
          </div>

          {/* Card 2: Microphone Access */}
          <div className="rounded-2xl border border-border/70 bg-surface/60 p-4 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-500 mt-0.5">
                  <Mic className="size-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-foreground">
                    Microphone Access
                  </h5>
                  <p className="text-xs text-muted/90 mt-0.5 leading-relaxed">
                    Allows you to record and send voice messages directly in chats.
                  </p>
                </div>
              </div>

              {micStatus === "granted" ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                  <CheckCircle2 className="size-3.5" />
                  Allowed
                </span>
              ) : null}
            </div>

            {micStatus === "denied" ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-danger/10 p-2.5 text-xs text-danger">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  Blocked in browser. Tap 🔒 in your address bar &gt; Permissions &gt; turn on <b>Microphone</b>.
                </p>
              </div>
            ) : micStatus !== "granted" ? (
              <button
                type="button"
                onClick={handleEnableMic}
                disabled={isEnablingMic}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:brightness-105 active:scale-98 transition"
              >
                {isEnablingMic ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mic className="size-4" />
                )}
                <span>{isEnablingMic ? "Enabling..." : "Allow Microphone"}</span>
              </button>
            ) : null}
          </div>

          {/* Android Heads-Up Banner Tip */}
          <div className="rounded-2xl border border-border/50 bg-surface/30 p-3 text-muted">
            <p className="text-[11px] leading-relaxed">
              💡 <span className="font-semibold text-foreground">Android Tip</span>: To ensure notifications pop down over apps like Instagram, make sure <b>&quot;Pop on screen&quot; / &quot;Banner&quot;</b> is enabled in your phone&apos;s <i>Settings &gt; Apps &gt; Chrome (or iMessage) &gt; Notifications</i>.
            </p>
          </div>

          {/* Bottom Action */}
          <div className="pt-2">
            {!allGranted ? (
              <button
                type="button"
                onClick={handleEnableAll}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-xs font-bold text-accent-foreground shadow-sm hover:brightness-105 active:scale-98 transition"
              >
                <span>Enable All Permissions</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={closeModal}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success px-4 py-3 text-xs font-bold text-white shadow-sm hover:brightness-105 active:scale-98 transition"
              >
                <CheckCircle2 className="size-4" />
                <span>All Set! Continue to Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
