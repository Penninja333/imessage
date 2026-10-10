import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../../theme/ThemeContext";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";

interface Props {
  receiverId: string;
}

export const ChatComposer: React.FC<Props> = ({ receiverId }) => {
  const { colors, isDark } = useAppTheme();
  const socket = useAuthStore((s) => s.socket);
  const replyingTo = useChatStore((s) => s.replyingTo);
  const editingMessage = useChatStore((s) => s.editingMessage);
  const setReplyingTo = useChatStore((s) => s.setReplyingTo);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const sendTyping = useChatStore((s) => s.sendTyping);
  const sendStopTyping = useChatStore((s) => s.sendStopTyping);

  const [text, setText] = useState("");
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "");
    }
  }, [editingMessage]);

  const handleTextChange = (val: string) => {
    setText(val);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (val.trim()) {
      sendTyping(receiverId, socket);
      typingTimeoutRef.current = setTimeout(() => {
        sendStopTyping(receiverId, socket);
      }, 2500);
    } else {
      sendStopTyping(receiverId, socket);
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendStopTyping(receiverId, socket);

    if (editingMessage) {
      const ok = await editMessage(editingMessage._id, trimmed);
      if (ok) {
        setText("");
        setEditingMessage(null);
      }
      return;
    }

    setText("");
    await sendMessage(receiverId, trimmed);
  };

  const canSend = text.trim().length > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: isDark ? "#2C2C2E" : "#E5E5EA",
        },
      ]}
    >
      {/* Banner for Replying Mode */}
      {replyingTo ? (
        <View style={[styles.modeBanner, { backgroundColor: colors.surface }]}>
          <View style={styles.modeTextContainer}>
            <Text style={[styles.modeTitle, { color: colors.accent }]}>Replying to message</Text>
            <Text style={[styles.modeSnippet, { color: colors.textMuted }]} numberOfLines={1}>
              {replyingTo.text || "Media"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.closeModeButton}>
            <Text style={[styles.closeModeText, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Banner for Editing Mode */}
      {editingMessage ? (
        <View style={[styles.modeBanner, { backgroundColor: colors.surface }]}>
          <View style={styles.modeTextContainer}>
            <Text style={[styles.modeTitle, { color: colors.accent }]}>Editing message</Text>
            <Text style={[styles.modeSnippet, { color: colors.textMuted }]} numberOfLines={1}>
              {editingMessage.text}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingMessage(null);
              setText("");
            }}
            style={styles.closeModeButton}
          >
            <Text style={[styles.closeModeText, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
              color: colors.text,
              borderColor: isDark ? "#2C2C2E" : "#E5E5EA",
            },
          ]}
          placeholder={editingMessage ? "Edit message..." : "iMessage"}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={4000}
          value={text}
          onChangeText={handleTextChange}
          enablesReturnKeyAutomatically
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? colors.accent : isDark ? "#2C2C2E" : "#E5E5EA" },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.sendArrow,
              { color: canSend ? "#FFFFFF" : isDark ? "#636366" : "#8E8E93" },
            ]}
          >
            ↑
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  modeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 6,
  },
  modeTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  modeTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  modeSnippet: {
    fontSize: 12,
  },
  closeModeButton: {
    padding: 4,
  },
  closeModeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  sendArrow: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: -2,
  },
});
