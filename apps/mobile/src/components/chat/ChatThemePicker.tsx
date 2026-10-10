import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../../theme/ThemeContext";
import { CHAT_THEMES } from "../../theme/chatThemes";

interface Props {
  visible: boolean;
  currentThemeId: string;
  onSelectTheme: (themeId: string) => void;
  onClose: () => void;
}

export const ChatThemePicker: React.FC<Props> = ({
  visible,
  currentThemeId,
  onSelectTheme,
  onClose,
}) => {
  const { colors, isDark } = useAppTheme();
  const themesList = Object.values(CHAT_THEMES);

  const handleSelect = (id: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onSelectTheme(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Chat Theme</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Change the accent color of chat bubbles for both participants
          </Text>

          <ScrollView contentContainerStyle={styles.grid}>
            {themesList.map((theme) => {
              const isSelected = currentThemeId === theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeItem,
                    isSelected && {
                      borderColor: colors.accent,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => handleSelect(theme.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.colorCircle,
                      { backgroundColor: theme.bubbleColor },
                    ]}
                  >
                    {isSelected ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                  <Text
                    style={[
                      styles.themeName,
                      { color: colors.text, fontWeight: isSelected ? "700" : "500" },
                    ]}
                    numberOfLines={1}
                  >
                    {theme.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    paddingBottom: 30,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 20,
  },
  themeItem: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: "rgba(128,128,128,0.08)",
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  checkMark: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  themeName: {
    fontSize: 12,
    textAlign: "center",
  },
});
