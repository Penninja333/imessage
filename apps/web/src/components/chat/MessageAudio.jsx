import { useEffect, useRef, useState } from "react";
import { Loader2Icon, PauseIcon, PlayIcon } from "lucide-react";

// Generate stable simulated waveform bar heights based on audio URL
function getWaveformBars(seedStr, count = 28) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const bars = [];
  for (let i = 0; i < count; i++) {
    const x = Math.sin(hash + i * 1.7) * 10000;
    const norm = Math.abs(x - Math.floor(x));
    // Bar height between 20% and 100%
    bars.push(Math.round(20 + norm * 80));
  }
  return bars;
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

const PLAYBACK_RATES = [1, 1.5, 2];

export function MessageAudio({ src, isOwnMessage }) {
  const audioRef = useRef(null);
  const waveformRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRateIndex, setPlaybackRateIndex] = useState(0);

  const bars = useRef(getWaveformBars(src || "audio", 26)).current;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && isFinite(audio.duration) && !duration) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [duration]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        setIsLoading(true);
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Audio playback error:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleWaveformClick = (e) => {
    const waveform = waveformRef.current;
    const audio = audioRef.current;
    if (!waveform || !audio) return;

    const rect = waveform.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = pct * (duration || audio.duration || 0);

    if (isFinite(targetTime)) {
      audio.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const togglePlaybackRate = () => {
    const nextIndex = (playbackRateIndex + 1) % PLAYBACK_RATES.length;
    setPlaybackRateIndex(nextIndex);
    const rate = PLAYBACK_RATES[nextIndex];
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const currentPlaybackRate = PLAYBACK_RATES[playbackRateIndex];

  return (
    <div className="flex min-w-[210px] sm:min-w-[250px] max-w-full flex-col gap-1.5 py-1">
      <audio ref={audioRef} src={src} preload="metadata" playsInline />

      <div className="flex items-center gap-2.5">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 ${
            isOwnMessage
              ? "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
              : "bg-accent text-accent-foreground hover:brightness-110 shadow-sm"
          }`}
          aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
        >
          {isLoading ? (
            <Loader2Icon className="size-5 animate-spin" />
          ) : isPlaying ? (
            <PauseIcon className="size-5 fill-current" />
          ) : (
            <PlayIcon className="size-5 fill-current translate-x-0.5" />
          )}
        </button>

        {/* Audio Waveform Bars */}
        <div
          ref={waveformRef}
          onClick={handleWaveformClick}
          className="flex h-8 flex-1 cursor-pointer items-center gap-[2.5px] px-1 py-1 touch-none select-none"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label="Audio scrubber"
        >
          {bars.map((heightPercent, index) => {
            const barFraction = index / bars.length;
            const isPlayed = barFraction <= progress;

            return (
              <span
                key={index}
                style={{ height: `${heightPercent}%` }}
                className={`w-[3px] rounded-full transition-all duration-100 ${
                  isOwnMessage
                    ? isPlayed
                      ? "bg-white"
                      : "bg-white/35"
                    : isPlayed
                      ? "bg-accent"
                      : "bg-muted-foreground/30 dark:bg-muted-foreground/40"
                }`}
              />
            );
          })}
        </div>

        {/* Playback speed toggle */}
        <button
          type="button"
          onClick={togglePlaybackRate}
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors ${
            isOwnMessage
              ? "bg-white/20 text-white/90 hover:bg-white/30"
              : "bg-surface-elevated text-muted hover:text-foreground border border-border/50"
          }`}
          title="Playback speed"
        >
          {currentPlaybackRate}x
        </button>
      </div>

      {/* Duration / Elapsed Time */}
      <div className="flex items-center justify-between px-1 text-[11px] tabular-nums">
        <span className={isOwnMessage ? "text-white/80" : "text-muted"}>
          {isPlaying || currentTime > 0
            ? formatDuration(currentTime)
            : formatDuration(duration)}
        </span>
        {duration > 0 && (
          <span className={isOwnMessage ? "text-white/60" : "text-muted/70"}>
            {isPlaying
              ? `-${formatDuration(Math.max(0, duration - currentTime))}`
              : "Voice message"}
          </span>
        )}
      </div>
    </div>
  );
}
