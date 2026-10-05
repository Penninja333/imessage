import { Button, TextArea } from "@heroui/react";
import {
  ImageIcon,
  LoaderIcon,
  MicIcon,
  SendHorizontalIcon,
  Trash2Icon,
  Reply,
  X as XIcon,
  Pencil,
  Check,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import useKeyboardSound from "../../hooks/useKeyboardSound";
import { useChatStore } from "../../store/useChatStore";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { withTransform } from "../../lib/imagekit";
import { AppleEmojiText } from "../common/AppleEmoji";
import { MediaConfirmationModal } from "./MediaConfirmationModal";

function formatDuration(secs) {
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
}

export function ChatComposer() {
  const composerText = useChatStore((state) => state.composerText);
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);
  const sendMediaMessage = useChatStore((state) => state.sendMediaMessage);
  const sendVoiceMessage = useChatStore((state) => state.sendVoiceMessage);
  const isSendingMedia = useChatStore((state) => state.isSendingMedia);
  const sendTextMessage = useChatStore((state) => state.sendTextMessage);
  const setComposerText = useChatStore((state) => state.setComposerText);
  const replyingTo = useChatStore((state) => state.replyingTo);
  const clearReplyingTo = useChatStore((state) => state.clearReplyingTo);
  const editingMessage = useChatStore((state) => state.editingMessage);
  const cancelEditingMessage = useChatStore((state) => state.cancelEditingMessage);
  const editMessage = useChatStore((state) => state.editMessage);
  const setDraft = useChatStore((state) => state.setDraft);
  const { activeConversation, activeConversationId } = useSelectedConversation();
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [pendingMediaFile, setPendingMediaFile] = useState(null);

  const mediaInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync composer input when editingMessage is selected
  useEffect(() => {
    if (editingMessage) {
      setComposerText(editingMessage.text || "");
      if (textareaRef.current) {
        const el =
          textareaRef.current.tagName === "TEXTAREA"
            ? textareaRef.current
            : textareaRef.current.querySelector?.("textarea") || textareaRef.current;
        if (el && typeof el.focus === "function") {
          el.focus();
        }
      }
    }
  }, [editingMessage, setComposerText]);

  // Typing indicator
  const sendTyping = useChatStore((state) => state.sendTyping);
  const sendStopTyping = useChatStore((state) => state.sendStopTyping);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioStreamRef = useRef(null);

  const playSoundIfEnabled = () => {
    if (isSoundEnabled) playRandomKeyStrokeSound();
  };

  // Helper to reliably keep focus on the composer input on mobile devices
  const focusInput = () => {
    if (!textareaRef.current) return;
    const el =
      textareaRef.current.tagName === "TEXTAREA"
        ? textareaRef.current
        : textareaRef.current.querySelector?.("textarea") || textareaRef.current;
    if (el && typeof el.focus === "function") {
      el.focus({ preventScroll: true });
    }
  };

  const handleSend = async (e) => {
    if (e) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }

    // Keep focus synchronously during user interaction
    focusInput();

    const text = composerText.trim();
    if (!text) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    lastTypingSentRef.current = 0;
    sendStopTyping(activeConversationId);

    if (editingMessage) {
      const didEdit = await editMessage(editingMessage.id, text);
      if (didEdit) {
        setComposerText("");
        cancelEditingMessage();
        playSoundIfEnabled();
      }
      focusInput();
      requestAnimationFrame(focusInput);
      setTimeout(focusInput, 40);
      return;
    }

    const didSendMessage = await sendTextMessage(activeConversationId);
    if (didSendMessage) playSoundIfEnabled();

    // Re-focus immediately and on next frame to guarantee mobile keyboard stays open
    focusInput();
    requestAnimationFrame(focusInput);
    setTimeout(focusInput, 40);
  };

  const handleComposerTextChange = (event) => {
    const val = event.target.value;
    setComposerText(val);

    if (activeConversationId) {
      if (!editingMessage) {
        setDraft(activeConversationId, val);
      }
      const now = Date.now();
      if (now - lastTypingSentRef.current > 1500) {
        lastTypingSentRef.current = now;
        sendTyping(activeConversationId);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendStopTyping(activeConversationId);
        lastTypingSentRef.current = 0;
      }, 2000);
    }
  };

  const handleFocus = () => {
    // Scroll chat to bottom when keyboard opens
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
  };

  const handleMediaPick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File exceeds 25MB limit");
      return;
    }

    setPendingMediaFile(file);
  };

  const handlePaste = (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (
        item.kind === "file" &&
        (item.type.startsWith("image/") ||
          item.type.startsWith("video/") ||
          item.type.startsWith("audio/"))
      ) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          if (file.size > 25 * 1024 * 1024) {
            toast.error("File exceeds 25MB limit");
            return;
          }
          setPendingMediaFile(file);
          break;
        }
      }
    }
  };

  const handleConfirmMediaSend = async ({ file, caption }) => {
    if (!activeConversationId || !file) return false;

    const didSendMessage = await sendMediaMessage({
      conversationId: activeConversationId,
      file,
      caption,
    });

    if (didSendMessage) {
      playSoundIfEnabled();
      if (caption && composerText.trim() === caption.trim()) {
        setComposerText("");
      }
      return true;
    }
    return false;
  };

  const handleCloseMediaConfirm = () => {
    setPendingMediaFile(null);
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Audio recording is not supported in this browser");
        return;
      }

      // Check supported MIME type across mobile browsers (Chrome, Safari, Firefox)
      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        const types = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg",
          "audio/wav",
        ];
        for (const t of types) {
          if (MediaRecorder.isTypeSupported(t)) {
            mimeType = t;
            break;
          }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Microphone permission denied. Please allow microphone access.");
      } else {
        toast.error("Could not access microphone");
      }
    }
  };

  // Discard and cancel voice recording
  const cancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
  };

  // Stop recording and send voice message
  const stopAndSendRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.onstop = async () => {
      try {
        const mimeType = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size > 0 && activeConversationId) {
          const didSend = await sendVoiceMessage({
            conversationId: activeConversationId,
            audioBlob,
          });
          if (didSend) playSoundIfEnabled();
        }
      } catch (err) {
        console.error("Failed to send voice recording:", err);
        toast.error("Failed to send voice recording");
      } finally {
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
        audioChunksRef.current = [];
        setIsRecording(false);
        setRecordingDuration(0);
      }
    };

    recorder.stop();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const hasText = composerText.trim().length > 0;

  return (
    <footer className="shrink-0 border-t border-border bg-background/95 backdrop-blur-md px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] sm:px-3">
      {isSendingMedia ? (
        <div className="mx-auto mb-2 flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
          <LoaderIcon
            className="size-4 shrink-0 animate-spin text-accent"
            strokeWidth={2}
            aria-hidden
          />
          <span className="truncate">Uploading media...</span>
        </div>
      ) : null}

      {/* Edit Message Banner */}
      {editingMessage ? (
        <div className="mx-auto mb-1.5 flex w-full max-w-full items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 animate-in slide-in-from-bottom-1 duration-200">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Pencil className="size-4 shrink-0 text-accent" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[11px] font-semibold text-accent leading-none">
                Editing Message
              </span>
              <span className="truncate text-[12px] text-muted-foreground/90 mt-0.5">
                <AppleEmojiText text={editingMessage.text} disableBigEmoji />
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              cancelEditingMessage();
              setComposerText("");
            }}
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-border/80 hover:text-foreground transition"
            aria-label="Cancel editing"
            title="Cancel editing"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ) : null}

      {/* Reply Preview Banner */}
      {replyingTo ? (
        <div className="mx-auto mb-1.5 flex w-full max-w-full items-center gap-2 rounded-xl border border-accent/30 bg-accent/8 px-3 py-2 animate-in slide-in-from-bottom-1 duration-200">
          <Reply className="size-4 shrink-0 text-accent" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-accent leading-none">
              Replying to {replyingTo.senderName}
            </span>
            {replyingTo.imageUrl ? (
              <div className="flex items-center gap-1.5">
                <img
                  src={withTransform(replyingTo.imageUrl, "q-auto,w-80,f-auto")}
                  alt="Replied photo"
                  className="h-6 w-6 rounded object-cover shrink-0"
                />
                <span className="truncate text-[12px] text-muted">
                  {replyingTo.text ? (
                    <AppleEmojiText text={replyingTo.text} disableBigEmoji />
                  ) : (
                    "📷 Photo"
                  )}
                </span>
              </div>
            ) : replyingTo.videoUrl ? (
              <span className="text-[12px] text-muted truncate">🎥 Video</span>
            ) : replyingTo.audioUrl ? (
              <span className="text-[12px] text-muted truncate">🎤 Voice message</span>
            ) : (
              <span className="text-[12px] text-muted truncate">
                <AppleEmojiText text={replyingTo.text} disableBigEmoji />
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={clearReplyingTo}
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-border/80 hover:text-foreground transition"
            aria-label="Cancel reply"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ) : null}

      {isRecording ? (
        /* Native-style Voice Recording Bar */
        <div className="mx-auto flex w-full max-w-full items-center justify-between gap-2 rounded-full border border-red-500/40 bg-surface/90 px-3 py-1.5 shadow-sm backdrop-blur-sm sm:gap-3 sm:px-4">
          {/* Pulsing red dot and recording timer */}
          <div className="flex items-center gap-2">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-red-500" />
            </span>
            <span className="text-xs font-semibold text-red-500 tabular-nums">
              {formatDuration(recordingDuration)}
            </span>
          </div>

          {/* Animated sound wave bars */}
          <div className="flex items-center gap-1">
            <span className="h-3 w-1 animate-pulse rounded-full bg-red-500/60" />
            <span className="h-5 w-1 animate-pulse rounded-full bg-red-500 delay-75" />
            <span className="h-2 w-1 animate-pulse rounded-full bg-red-500/70 delay-150" />
            <span className="h-6 w-1 animate-pulse rounded-full bg-red-500 delay-100" />
            <span className="h-4 w-1 animate-pulse rounded-full bg-red-500/80 delay-200" />
            <span className="h-7 w-1 animate-pulse rounded-full bg-red-500 delay-300" />
            <span className="h-3 w-1 animate-pulse rounded-full bg-red-500/60 delay-100" />
          </div>

          {/* Recording actions: Discard & Send */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-red-500/10 hover:text-red-500 active:scale-95 transition-all"
              title="Discard recording"
              aria-label="Discard recording"
            >
              <Trash2Icon className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={stopAndSendRecording}
              className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm hover:brightness-110 active:scale-95 transition-all"
              title="Send voice message"
              aria-label="Send voice message"
            >
              <SendHorizontalIcon className="size-4.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Regular Message Composer */
        <div className="mx-auto flex w-full max-w-full items-end gap-1.5 px-0.5 sm:gap-2 sm:px-1">
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="sr-only"
            disabled={isSendingMedia}
            tabIndex={-1}
            aria-hidden
            onChange={handleMediaPick}
          />
          <Button
            variant="ghost"
            isIconOnly
            isDisabled={isSendingMedia}
            className="size-10 shrink-0 touch-manipulation self-end text-accent"
            onPress={() => mediaInputRef.current?.click()}
            aria-label="Attach media"
          >
            <ImageIcon className="size-5 sm:size-6" strokeWidth={2} />
          </Button>

          <TextArea
            ref={textareaRef}
            fullWidth
            variant="secondary"
            placeholder="iMessage"
            rows={1}
            value={composerText}
            onChange={handleComposerTextChange}
            onFocus={handleFocus}
            onPaste={handlePaste}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend(event);
              }
            }}
            className="flex-1 rounded-full text-base"
          />

          {editingMessage ? (
            /* Save Edit Button */
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                focusInput();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                focusInput();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                focusInput();
              }}
              onClick={handleSend}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm hover:brightness-105 active:scale-95 transition-transform"
              aria-label="Save edited message"
              title="Save edit"
            >
              <Check className="size-5" strokeWidth={2.5} />
            </button>
          ) : hasText ? (
            /* Send Button — with pointer/touch preventDefault to preserve mobile keyboard focus */
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                focusInput();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                focusInput();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                focusInput();
              }}
              onClick={handleSend}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm hover:brightness-105 active:scale-95 transition-transform"
              aria-label="Send message"
            >
              <SendHorizontalIcon className="size-5" />
            </button>
          ) : (
            /* Mic Button — tap to start recording voice message */
            <button
              type="button"
              onClick={startRecording}
              disabled={isSendingMedia}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-accent hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all shadow-sm"
              aria-label="Record voice message"
              title="Record voice message"
            >
              <MicIcon className="size-5" />
            </button>
          )}
        </div>
      )}

      {/* Media Confirmation & Preview Modal before sending */}
      <MediaConfirmationModal
        isOpen={Boolean(pendingMediaFile)}
        file={pendingMediaFile}
        recipientName={
          activeConversation?.peer?.nickname ||
          activeConversation?.peer?.fullName ||
          ""
        }
        replyingTo={replyingTo}
        initialCaption={composerText}
        onClose={handleCloseMediaConfirm}
        onSend={handleConfirmMediaSend}
      />
    </footer>
  );
}
