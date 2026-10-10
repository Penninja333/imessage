import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../../theme/ThemeContext";
import { ApiMessage } from "../../api/messages";

interface Props {
  pinnedMessages: ApiMessage[];
  onPressMessage: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
}

export const PinnedBanner: React.FC<Props> = ({
  pinnedMessages,
  onPressMessage,
  onUnpin,
}) => {
  const { colors, isDark } = useAppTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const safeIndex = Math.min(currentIndex, pinnedMessages.length - 1);
  const currentMsg = pinnedMessages[safeIndex];
  if (!currentMsg) return null;

  const handleNext = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
  };

  const getSnippet = (msg: ApiMessage) => {
    if (msg.text) return msg.text;
    if (msg.image) return "📷 Photo";
    if (msg.audio) return "🎤 Voice message";
    if (msg.fileUrl) return `📄 ${msg.fileName || "Document"}`;
    return "Pinned message";
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
      <TouchableOpacity
        style={styles.content}
        onPress={() => onPressMessage(currentMsg._id)}
        activeOpacity={0.7}
      >
        <Text style={styles.pinIcon}>📌</Text>
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.accent }]}>
              Pinned message {pinnedMessages.length > 1 ? `(${safeIndex + 1}/${pinnedMessages.length})` : ""}
            </Text>
          </View>
          <Text
            style={[styles.snippetText, { color: colors.text }]}
            numberOfLines={1}
          >
            {getSnippet(currentMsg)}
          </Text>
        </View>
      </TouchableOpacity>

      {pinnedMessages.length > 1 ? (
        <TouchableOpacity style={styles.cycleBtn} onPress={handleNext}>
          <Text style={[styles.cycleArrow, { color: colors.accent }]}>›</Text>
        </TouchableOpacity>
      ) : null}

      {onUnpin ? (
        <TouchableOpacity
          style={styles.unpinBtn}
          onPress={() => onUnpin(currentMsg._id)}
        >
          <Text style={[styles.unpinText, { color: colors.textMuted }]}>✕</Text>
        </TouchableOpacity>
      ) : null}
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
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pinIcon: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  snippetText: {
    fontSize: 13,
    fontWeight: "500",
  },
  cycleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cycleArrow: {
    fontSize: 20,
    fontWeight: "700",
  },
  unpinBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  unpinText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
