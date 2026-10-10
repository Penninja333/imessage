import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../../theme/ThemeContext";
import { ApiMessage } from "../../api/messages";

interface Props {
  messages: ApiMessage[];
  onSelectMatch: (messageId: string) => void;
  onClose: () => void;
}

export const InChatSearch: React.FC<Props> = ({
  messages,
  onSelectMatch,
  onClose,
}) => {
  const { colors, isDark } = useAppTheme();
  const [query, setQuery] = useState("");
  const [matchingIds, setMatchingIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setMatchingIds([]);
      setCurrentIndex(0);
      return;
    }

    const matches = messages
      .filter((m) => m.text && !m.deleted && m.text.toLowerCase().includes(trimmed))
      .map((m) => m._id);

    setMatchingIds(matches);
    setCurrentIndex(matches.length > 0 ? 0 : 0);

    if (matches.length > 0) {
      onSelectMatch(matches[0]);
    }
  }, [query, messages]);

  const handlePrev = () => {
    if (matchingIds.length <= 1) return;
    try {
      Haptics.selectionAsync();
    } catch {}
    const newIdx = (currentIndex - 1 + matchingIds.length) % matchingIds.length;
    setCurrentIndex(newIdx);
    onSelectMatch(matchingIds[newIdx]);
  };

  const handleNext = () => {
    if (matchingIds.length <= 1) return;
    try {
      Haptics.selectionAsync();
    } catch {}
    const newIdx = (currentIndex + 1) % matchingIds.length;
    setCurrentIndex(newIdx);
    onSelectMatch(matchingIds[newIdx]);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
          borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA",
        },
      ]}
    >
      <View
        style={[
          styles.searchBox,
          { backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF" },
        ]}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Search in chat..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn}>
            <Text style={[styles.clearText, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {query.trim().length > 0 ? (
        <View style={styles.matchControls}>
          <Text style={[styles.countText, { color: colors.textMuted }]}>
            {matchingIds.length > 0
              ? `${currentIndex + 1} of ${matchingIds.length}`
              : "0 results"}
          </Text>

          <TouchableOpacity
            onPress={handlePrev}
            disabled={matchingIds.length <= 1}
            style={[styles.arrowBtn, matchingIds.length <= 1 && styles.disabledBtn]}
          >
            <Text style={[styles.arrowText, { color: colors.accent }]}>↑</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            disabled={matchingIds.length <= 1}
            style={[styles.arrowBtn, matchingIds.length <= 1 && styles.disabledBtn]}
          >
            <Text style={[styles.arrowText, { color: colors.accent }]}>↓</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
        <Text style={[styles.doneText, { color: colors.accent }]}>Done</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    fontSize: 12,
    fontWeight: "600",
  },
  matchControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: "500",
    marginRight: 4,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledBtn: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 16,
    fontWeight: "700",
  },
  doneBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  doneText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
