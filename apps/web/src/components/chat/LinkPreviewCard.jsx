import { useEffect } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";

export function LinkPreviewCard({ url, isOwnMessage }) {
  const preview = useChatStore((state) => (url ? state.linkPreviews[url] : null));
  const fetchLinkPreview = useChatStore((state) => state.fetchLinkPreview);

  useEffect(() => {
    if (url && preview === undefined) {
      fetchLinkPreview(url);
    }
  }, [url, preview, fetchLinkPreview]);

  if (!preview || preview === "loading" || !preview.title) {
    return null;
  }

  const hostname = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return preview.siteName || "";
    }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`mt-2 block overflow-hidden rounded-xl border transition-all hover:brightness-105 active:scale-[0.99] text-left no-underline ${
        isOwnMessage
          ? "border-white/20 bg-white/10 text-white"
          : "border-border/70 bg-surface/90 text-foreground shadow-xs"
      }`}
    >
      {preview.image ? (
        <div className="relative aspect-[16/9] max-h-36 w-full overflow-hidden bg-black/10">
          <img
            src={preview.image}
            alt={preview.title}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              // Hide broken preview images
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      ) : null}

      <div className="p-2.5 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-1 opacity-75">
          <span className="text-[10px] font-semibold uppercase tracking-wider truncate">
            {preview.siteName || hostname}
          </span>
          <ExternalLinkIcon className="size-3 shrink-0" />
        </div>

        <p className="line-clamp-2 text-xs font-semibold leading-snug">
          {preview.title}
        </p>

        {preview.description ? (
          <p className="line-clamp-2 text-[11px] opacity-80 leading-normal mt-0.5">
            {preview.description}
          </p>
        ) : null}
      </div>
    </a>
  );
}
