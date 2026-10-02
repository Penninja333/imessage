import { withTransform } from "../../lib/imagekit";
import { MessageVideo } from "./MessageVideo";
import { MessageAudio } from "./MessageAudio";
import { SparklesIcon } from "lucide-react";

// Compress + size images for the bubble (q-auto works for images; f-auto picks WebP/AVIF).
const IMAGE_TRANSFORM = "q-auto,w-640,f-auto";

export function MessageBubble({ message }) {
  // If it is a system event (e.g. Nickname updated)
  if (message.isSystem) {
    return (
      <div className="my-2 flex w-full justify-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/60 px-3 py-1 text-xs text-muted shadow-sm backdrop-blur-sm">
          <SparklesIcon className="size-3 text-accent" />
          <span>{message.text}</span>
          <span className="text-[10px] opacity-60">· {message.time}</span>
        </div>
      </div>
    );
  }

  const isOwnMessage = message.role === "me";
  const hasImage = Boolean(message.imageUrl);
  const hasVideo = Boolean(message.videoUrl);
  const hasAudio = Boolean(message.audioUrl);
  const isDeleted = Boolean(message.deleted);

  return (
    <div className={`group flex w-full ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[min(90%,28rem)] rounded-2xl px-3 py-2 text-[15px] leading-snug sm:max-w-[min(75%,28rem)] sm:px-3.5 ${
          isOwnMessage
            ? "rounded-br-md bg-accent text-accent-foreground"
            : "rounded-bl-md bg-surface text-foreground"
        }`}
      >
        {hasImage ? (
          <img
            src={withTransform(message.imageUrl, IMAGE_TRANSFORM)}
            alt=""
            className="mb-1.5 max-h-40 max-w-full rounded-lg object-cover sm:max-h-52 sm:rounded-xl"
          />
        ) : null}
        {hasVideo ? <MessageVideo src={message.videoUrl} /> : null}
        {hasAudio ? <MessageAudio src={message.audioUrl} isOwnMessage={isOwnMessage} /> : null}
        {message.text ? (
          <p
            className={`whitespace-pre-wrap wrap-break-word ${
              isDeleted ? "italic opacity-70" : ""
            }`}
          >
            {message.text}
          </p>
        ) : null}
        <p
          className={`mt-1 text-[11px] tabular-nums ${
            isOwnMessage ? "text-accent-foreground/75" : "text-muted"
          }`}
        >
          {message.time}
        </p>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 ? (
          <div
            className={`absolute -bottom-2 flex gap-0.5 rounded-full border border-border bg-background px-1.5 py-0.5 text-xs shadow-md ${
              isOwnMessage ? "right-2" : "left-2"
            }`}
          >
            {message.reactions.map((r, i) => (
              <span key={i}>{r.emoji}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
