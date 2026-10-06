import { useEffect, useRef, useState } from "react";
import { Loader2Icon, PauseIcon, PlayIcon } from "lucide-react";
import toast from "react-hot-toast";

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
    if (!audio || !src) return;

    // Detect and handle audio duration (including Chromium WebM Infinity duration bug)
    const handleDuration = () => {
      if (audio.duration === Infinity) {
        // MediaRecorder WebM files don't have header duration; seek probe trick discovers it
        const onProbe = () => {
          audio.removeEventListener("timeupdate", onProbe);
          if (isFinite(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration);
          } else if (isFinite(audio.currentTime) && audio.currentTime > 0) {
            setDuration(audio.currentTime);
          }
          audio.currentTime = 0;
        };
        audio.addEventListener("timeupdate", onProbe, { once: true });
        audio.currentTime = 1e10;
      } else if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (isFinite(audio.currentTime) && audio.currentTime > duration) {
        setDuration(audio.currentTime);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = () => {
      console.warn("Audio element error:", audio.error);
      setIsPlaying(false);
      setIsLoading(false);
    };

    // Auto-pause if another voice note in the app starts playing
    const handleOtherAudioPlay = (e) => {
      if (e.detail !== audio && !audio.paused) {
        audio.pause();
      }
    };

    audio.addEventListener("loadedmetadata", handleDuration);
    audio.addEventListener("durationchange", handleDuration);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    window.addEventListener("imessage-audio-play", handleOtherAudioPlay);

    // Initial check if metadata already loaded
    if (audio.readyState >= 1) {
      handleDuration();
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleDuration);
      audio.removeEventListener("durationchange", handleDuration);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      window.removeEventListener("imessage-audio-play", handleOtherAudioPlay);
    };
  }, [src]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused && isPlaying) {
      audio.pause();
    } else {
      try {
        setIsLoading(true);

        // Notify other voice messages to pause
        window.dispatchEvent(
          new CustomEvent("imessage-audio-play", { detail: audio })
        );

        // On mobile PWA, ensure audio is loaded before initiating playback
        if (audio.readyState === 0) {
          audio.load();
        }

        await audio.play();
      } catch (err) {
        console.error("Audio playback error:", err);
        setIsLoading(false);
        setIsPlaying(false);
        if (err.name !== "AbortError") {
          toast.error("Could not play voice message");
        }
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
    const targetDuration = duration > 0 ? duration : (isFinite(audio.duration) ? audio.duration : 0);

    if (targetDuration > 0) {
      const targetTime = pct * targetDuration;
      if (isFinite(targetTime)) {
        audio.currentTime = targetTime;
        setCurrentTime(targetTime);
      }
    }
  };

  const togglePlaybackRate = () => {
    const nextIndex = (playbackRateIndex + 1) % PLAYBACK_RATES.length;
    setPlaybackRateIndex(nextIndex);
    const rate = PLAYBACK_RATES[nextIndex];
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      audioRef.current.defaultPlaybackRate = rate;
    }
  };

  const effectiveDuration = duration > 0 ? duration : (isFinite(audioRef.current?.duration) ? audioRef.current.duration : 0);
  const progress = effectiveDuration > 0 ? Math.min(1, currentTime / effectiveDuration) : 0;
  const currentPlaybackRate = PLAYBACK_RATES[playbackRateIndex];

  if (!src) return null;

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
            : formatDuration(effectiveDuration)}
        </span>
        <span className={isOwnMessage ? "text-white/60" : "text-muted/70"}>
          {isPlaying && effectiveDuration > 0
            ? `-${formatDuration(Math.max(0, effectiveDuration - currentTime))}`
            : effectiveDuration > 0
              ? formatDuration(effectiveDuration)
              : "Voice message"}
        </span>
      </div>
    </div>
  );
}
