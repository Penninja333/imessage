import { MessageCircleIcon, BellRingIcon } from "lucide-react";
import { usePermissionsStore } from "../../store/usePermissionsStore";

export function NoConversationPlaceholder() {
  const isNotificationGranted =
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted";

  return (
    <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:gap-5 sm:px-8 sm:py-16">
      <div
        className="flex size-22 items-center justify-center rounded-3xl bg-accent-soft"
        aria-hidden
      >
        <MessageCircleIcon className="size-10 text-accent" strokeWidth={1.25} />
      </div>
      <div className="max-w-76 space-y-2">
        <h2 className="text-[16px] font-semibold tracking-tight sm:text-[17px]">
          Select a chat to start
        </h2>
        <p className="text-[13px] leading-relaxed text-muted">
          Pick a conversation from the list on the left to read messages and reply.
        </p>
        {!isNotificationGranted ? (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => usePermissionsStore.getState().openModal()}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 active:scale-95 transition"
            >
              <BellRingIcon className="size-3.5" />
              <span>Enable Message Banners</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
