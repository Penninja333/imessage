import { useState } from "react";
import { ArrowUpCircleIcon, Loader2Icon, SparklesIcon, XIcon } from "lucide-react";
import { usePwaUpdateStore } from "../store/usePwaUpdateStore";

export default function UpdatePwaBanner() {
  const needRefresh = usePwaUpdateStore((state) => state.needRefresh);
  const dismissed = usePwaUpdateStore((state) => state.dismissed);
  const updateApp = usePwaUpdateStore((state) => state.updateApp);
  const dismissUpdate = usePwaUpdateStore((state) => state.dismissUpdate);

  const [isUpdating, setIsUpdating] = useState(false);

  if (!needRefresh || dismissed) {
    return null;
  }

  const handleUpdate = () => {
    setIsUpdating(true);
    updateApp();
  };

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 z-50 sm:max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-surface/95 px-3.5 py-3 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent ring-1 ring-accent/30">
            <SparklesIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-xs font-bold sm:text-sm">Update Available</h4>
            <p className="truncate text-[11px] text-muted">A new version is ready to install</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground shadow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            {isUpdating ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <ArrowUpCircleIcon className="size-3.5" />
            )}
            <span>{isUpdating ? "Restarting..." : "Update"}</span>
          </button>

          <button
            type="button"
            onClick={dismissUpdate}
            className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface-elevated hover:text-foreground transition"
            aria-label="Dismiss update notification"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
