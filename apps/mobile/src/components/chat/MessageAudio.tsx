import React, { useEffect, useState, useRef, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Audio } from "expo-av";
import { useAppTheme } from "../../theme/ThemeContext";

interface Props {
  uri: string;
  isOwn: boolean;
}

const PLAYBACK_RATES = [1, 1.5, 2];

function getWaveformBars(seed: string, count = 26): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.sin(hash + i * 1.7) * 10000;
    const norm = Math.abs(x - Math.floor(x));
    bars.push(Math.round(20 + norm * 80));
  }
  return bars;
}

function formatDuration(millis: number): string {
  if (!millis || isNaN(millis) || millis < 0) return "0:00";
  const totalSecs = Math.floor(millis / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const MessageAudio: React.FC<Props> = ({ uri, isOwn }) => {
  const { colors, isDark } = useAppTheme();
  const soundRef = useRef<Audio.Sound | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [rateIndex, setRateIndex] = useState(0);

  const bars = useMemo(() => getWaveformBars(uri || "audio", 24), [uri]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const togglePlay = async () => {
    if (!uri) return;

    try {
      if (!soundRef.current) {
        setIsLoading(true);
        const { sound, status } = await Audio.Sound.createAsync(
          { uri },
          { progressUpdateIntervalMillis: 100 },
          (playbackStatus) => {
            if (playbackStatus.isLoaded) {
              setPositionMillis(playbackStatus.positionMillis);
              setDurationMillis(playbackStatus.durationMillis || 0);
              setIsPlaying(playbackStatus.isPlaying);
              if (playbackStatus.didJustFinish) {
                setIsPlaying(false);
                setPositionMillis(0);
              }
            }
          }
        );
        soundRef.current = sound;
        setIsLoading(false);
        await sound.playAsync();
      } else {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
      }
    } catch (err) {
      console.warn("MessageAudio playback error:", err);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const toggleRate = async () => {
    const nextIdx = (rateIndex + 1) % PLAYBACK_RATES.length;
    setRateIndex(nextIdx);
    const newRate = PLAYBACK_RATES[nextIdx];
    if (soundRef.current) {
      try {
        await soundRef.current.setRateAsync(newRate, true);
      } catch {}
    }
  };

  const progress = durationMillis > 0 ? Math.min(1, positionMillis / durationMillis) : 0;
  const currentRate = PLAYBACK_RATES[rateIndex];

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.playButton,
            { backgroundColor: isOwn ? "rgba(255,255,255,0.25)" : colors.accent },
          ]}
          onPress={togglePlay}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.playIcon}>{isPlaying ? "⏸" : "▶"}</Text>
          )}
        </TouchableOpacity>

        {/* Waveform Scrubber */}
        <View style={styles.waveformContainer}>
          {bars.map((barHeight, idx) => {
            const barFraction = idx / bars.length;
            const isPlayed = barFraction <= progress;
            return (
              <View
                key={idx}
                style={[
                  styles.waveformBar,
                  {
                    height: `${barHeight}%`,
                    backgroundColor: isOwn
                      ? isPlayed
                        ? "#FFFFFF"
                        : "rgba(255,255,255,0.35)"
                      : isPlayed
                      ? colors.accent
                      : isDark
                      ? "#48484A"
                      : "#C7C7CC",
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Playback speed toggle */}
        <TouchableOpacity
          style={[
            styles.rateButton,
            { backgroundColor: isOwn ? "rgba(255,255,255,0.2)" : isDark ? "#2C2C2E" : "#E5E5EA" },
          ]}
          onPress={toggleRate}
          activeOpacity={0.7}
        >
          <Text style={[styles.rateText, { color: isOwn ? "#FFFFFF" : colors.text }]}>
            {currentRate}x
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timeRow}>
        <Text style={[styles.timeText, { color: isOwn ? "rgba(255,255,255,0.7)" : colors.textMuted }]}>
          {formatDuration(positionMillis)}
        </Text>
        <Text style={[styles.timeText, { color: isOwn ? "rgba(255,255,255,0.7)" : colors.textMuted }]}>
          {durationMillis > 0 ? formatDuration(durationMillis) : "Voice message"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 200,
    paddingVertical: 4,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: {
    color: "#FFFFFF",
    fontSize: 14,
    marginLeft: 1,
  },
  waveformContainer: {
    flex: 1,
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 2,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
  rateButton: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rateText: {
    fontSize: 11,
    fontWeight: "700",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
  },
});
