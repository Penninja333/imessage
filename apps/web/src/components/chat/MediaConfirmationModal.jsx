import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  SendHorizontalIcon,
  LoaderIcon,
  MusicIcon,
  Reply,
} from "lucide-react";
import { AppleEmojiText } from "../common/AppleEmoji";
import { compressImage } from "../../lib/imageCompression";
import { DocumentCard } from "./DocumentCard";
import { formatFileSize } from "../../lib/fileUtils";

/**
 * MediaConfirmationModal
 *
 * Intercepts media uploads before sending, allowing the user to:
 * 1. Preview the image/video/audio in full fidelity
 * 2. Review recipient, file name, and file size
 * 3. Add an optional caption text or view reply context
 * 4. Explicitly confirm ("Send") or reject ("Cancel" / "Don't Send")
 */
export function MediaConfirmationModal({
  isOpen,
  file,
  recipientName,
  replyingTo,
  initialCaption = "",
  onClose,
  onSend,
}) {
  const [prevFile, setPrevFile] = useState(file);
  const [caption, setCaption] = useState(initialCaption);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef(null);

  if (file !== prevFile) {
    setPrevFile(file);
    setCaption(initialCaption || "");
    setIsViewOnce(false);
  }

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Auto-focus caption input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen || isSending) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSending, onClose]);

  if (!isOpen || !file) return null;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");

  const mediaLabel = isImage ? "Photo" : isVideo ? "Video" : isAudio ? "Audio" : "Document";

  const handleConfirmSend = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSending) return;

    setIsSending(true);
    try {
      let fileToSend = file;
      if (isImage) {
        fileToSend = await compressImage(file);
      }
      const success = await onSend({
        file: fileToSend,
        caption: caption.trim(),
        viewOnce: isImage ? isViewOnce : false,
      });
      if (success) {
        onClose();
      }
    } finally {
      setIsSending(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm media send"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-xl p-0 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={(e) => {
        // Dismiss if user clicks backdrop outside modal dialog
        if (e.target === e.currentTarget && !isSending) {
          onClose();
        }
      }}
    >
      <div
        className="relative flex flex-col w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg md:max-w-xl bg-background/95 sm:border sm:border-border/80 sm:rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS-Style Navigation Header */}
        <header className="flex items-center justify-between border-b border-border/60 bg-surface/40 px-3.5 py-2.5 sm:px-5 sm:py-3 backdrop-blur-md">
          {/* Cancel button */}
          <button
            type="button"
            disabled={isSending}
            onClick={onClose}
            className="flex items-center gap-1 text-sm sm:text-base font-medium text-accent hover:opacity-80 active:scale-95 disabled:opacity-40 transition"
            aria-label="Cancel"
          >
            <X className="size-4 sm:size-4.5" />
            <span>Cancel</span>
          </button>

          {/* Header Title & Recipient */}
          <div className="flex flex-col items-center text-center px-2 min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
              Send {mediaLabel}
            </span>
            {recipientName ? (
              <span className="text-[11px] text-muted truncate max-w-[200px] sm:max-w-xs">
                To: <span className="text-foreground/90 font-medium">{recipientName}</span>
              </span>
            ) : null}
          </div>

          {/* File Size Badge */}
          <span className="rounded-full bg-surface/80 border border-border/60 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-muted tabular-nums shrink-0">
            {formatFileSize(file.size)}
          </span>
        </header>

        {/* Media Preview Viewport */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] max-h-[50vh] sm:max-h-[54vh] p-3 sm:p-4 bg-black/25 sm:m-3 sm:rounded-2xl sm:border sm:border-border/40 overflow-hidden">
          {previewUrl && isImage ? (
            <img
              src={previewUrl}
              alt={file.name || "Preview"}
              className="max-h-[46vh] sm:max-h-[50vh] w-auto max-w-full rounded-xl object-contain shadow-2xl select-none"
            />
          ) : previewUrl && isVideo ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="max-h-[46vh] sm:max-h-[50vh] w-auto max-w-full rounded-xl shadow-2xl outline-none"
            />
          ) : previewUrl && isAudio ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-accent/20 text-accent">
                <MusicIcon className="size-7" />
              </div>
              <audio src={previewUrl} controls className="w-full max-w-xs outline-none" />
              <span className="text-xs text-muted truncate max-w-xs">{file.name}</span>
            </div>
          ) : (
            <div className="w-full max-w-sm px-4 py-6 flex flex-col items-center">
              <div className="w-full">
                <DocumentCard
                  fileName={file.name}
                  fileSize={file.size}
                  fileType={file.type}
                  interactive={false}
                />
              </div>
            </div>
          )}
        </div>

        {/* Reply Context preview (if message is a reply) */}
        {replyingTo ? (
          <div className="mx-3 sm:mx-4 mb-2 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs">
            <Reply className="size-3.5 text-accent shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold text-accent text-[11px] leading-tight">
                Replying to {replyingTo.senderName}
              </span>
              <span className="text-muted truncate text-[11px]">
                {replyingTo.text ? (
                  <AppleEmojiText text={replyingTo.text} disableBigEmoji />
                ) : replyingTo.imageUrl ? (
                  "📷 Photo"
                ) : replyingTo.fileUrl ? (
                  `📄 ${replyingTo.fileName || "Document"}`
                ) : (
                  "Message"
                )}
              </span>
            </div>
          </div>
        ) : null}

        {/* Caption Input & Action Bar */}
        <footer className="border-t border-border/60 bg-surface/50 p-3 sm:p-4 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Caption Input Field & View Once Toggle */}
          <div className="relative mb-3 flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={caption}
              disabled={isSending}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleConfirmSend(e);
                }
              }}
              placeholder={isViewOnce ? "View once photo..." : "Add a caption... (optional)"}
              className={`w-full rounded-full border border-border/80 bg-background/90 py-2.5 pl-4 ${
                isImage ? "pr-12" : "pr-4"
              } text-sm sm:text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition shadow-inner`}
            />

            {/* View Once Toggle Button for Photos */}
            {isImage ? (
              <button
                type="button"
                onClick={() => setIsViewOnce((prev) => !prev)}
                title={isViewOnce ? "View once is ON (tap to turn off)" : "Set photo to view once"}
                className={`absolute right-2 flex size-8 items-center justify-center rounded-full transition-all active:scale-90 ${
                  isViewOnce
                    ? "bg-accent text-accent-foreground shadow-sm ring-2 ring-accent/30 scale-105"
                    : "text-muted hover:text-foreground hover:bg-surface/80"
                }`}
                aria-label="Toggle view once"
                aria-pressed={isViewOnce}
              >
                <span className="flex size-5.5 items-center justify-center rounded-full border-2 border-current text-[11px] font-black leading-none">
                  1
                </span>
              </button>
            ) : null}
          </div>

          {isImage && isViewOnce ? (
            <div className="mb-2.5 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-accent animate-in fade-in slide-in-from-top-1 duration-150">
              <span className="flex size-4 items-center justify-center rounded-full border border-accent text-[9px] font-bold">
                1
              </span>
              <span>Photo set to view once</span>
            </div>
          ) : null}

          {/* Action Buttons: Explicit Cancel vs Send */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSending}
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full border border-border/80 bg-surface text-sm font-medium text-muted hover:text-foreground hover:bg-surface/80 active:scale-95 disabled:opacity-40 transition shadow-sm"
            >
              Don't Send
            </button>

            <button
              type="button"
              disabled={isSending}
              onClick={handleConfirmSend}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold shadow-md hover:brightness-105 active:scale-95 disabled:opacity-60 transition"
            >
              {isSending ? (
                <>
                  <LoaderIcon className="size-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <SendHorizontalIcon className="size-4" />
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
