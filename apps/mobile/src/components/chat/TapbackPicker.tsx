import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback } from "react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../../theme/ThemeContext";

const REACTIONS = ["❤️", "👍", "👎", "😂", "‼️", "❓"];

interface Props {
  visible: boolean;
  activeReactions?: { userId: string; emoji: string }[];
  currentUserId?: string;
  onSelectReaction: (emoji: string) => void;
  onClose: () => void;
}

export const TapbackPicker: React.FC<Props> = ({
  visible,
  activeReactions = [],
  currentUserId,
  onSelectReaction,
  onClose,
}) => {
  const { colors, isDark } = useAppTheme();

  const handleSelect = (emoji: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onSelectReaction(emoji);
    onClose();
  };

  const myReaction = activeReactions.find((r) => String(r.userId) === String(currentUserId))?.emoji;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.capsule,
                {
                  backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
                  borderColor: isDark ? "#3A3A3C" : "#E5E5EA",
                },
              ]}
            >
              {REACTIONS.map((emoji) => {
                const isSelected = myReaction === emoji;
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.reactionButton,
                      isSelected && [styles.selectedButton, { backgroundColor: colors.accent + "30" }],
                    ]}
                    onPress={() => handleSelect(emoji)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  capsule: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    gap: 4,
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedButton: {
    borderRadius: 22,
  },
  emojiText: {
    fontSize: 24,
  },
});
