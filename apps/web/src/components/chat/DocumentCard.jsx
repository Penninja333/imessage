import { Download } from "lucide-react";
import { formatFileSize, getFileBadgeInfo } from "../../lib/fileUtils";

/**
 * Apple-style document card preview for message bubbles and modal previews
 */
export function DocumentCard({
  fileUrl,
  fileName,
  fileSize,
  fileType,
  isOwnMessage = false,
  interactive = true,
}) {
  const badge = getFileBadgeInfo(fileName, fileType);
  const Icon = badge.IconComponent;
  const displayName = fileName || "Document";
  const sizeString = formatFileSize(fileSize);

  const content = (
    <div
      className={`group/doc flex items-center gap-3 rounded-2xl p-2.5 transition-all duration-200 ${
        isOwnMessage
          ? "bg-black/15 hover:bg-black/25 text-inherit border border-white/10"
          : "bg-surface/80 hover:bg-surface text-foreground border border-border/60 shadow-xs"
      }`}
    >
      {/* File Badge */}
      <div
        className={`relative flex size-11 shrink-0 flex-col items-center justify-center rounded-xl font-bold shadow-sm ${badge.bgLight} ${badge.textColor} border ${badge.borderColor}`}
      >
        <Icon className="size-5" />
        <span className="text-[9px] font-extrabold tracking-tight uppercase leading-none mt-0.5">
          {badge.label}
        </span>
      </div>

      {/* Info details */}
      <div className="flex-1 min-w-0 pr-1 text-left">
        <p className="truncate text-xs font-semibold leading-snug drop-shadow-xs">
          {displayName}
        </p>
        <p
          className={`text-[10px] leading-tight truncate mt-0.5 ${
            isOwnMessage ? "opacity-80" : "text-muted"
          }`}
        >
          {badge.typeDescription} {sizeString ? `• ${sizeString}` : ""}
        </p>
      </div>

      {/* Download Action */}
      {interactive && fileUrl ? (
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-transform group-hover/doc:scale-105 active:scale-95 ${
            isOwnMessage
              ? "bg-white/20 text-inherit hover:bg-white/30"
              : "bg-accent/15 text-accent hover:bg-accent hover:text-accent-foreground"
          }`}
          title={`Download ${displayName}`}
        >
          <Download className="size-4" strokeWidth={2.2} />
        </div>
      ) : null}
    </div>
  );

  if (interactive && fileUrl) {
    return (
      <a
        href={fileUrl}
        download={fileName || "document"}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="block no-underline select-none my-1"
      >
        {content}
      </a>
    );
  }

  return <div className="my-1 select-none">{content}</div>;
}
