import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ConversationItem, formatTime } from "../../utils/normalize";
import { Avatar } from "../common/Avatar";
import { useAppTheme } from "../../theme/ThemeContext";

interface Props {
  conversation: ConversationItem;
  onPress: () => void;
}

const ConversationRowComponent: React.FC<Props> = ({ conversation, onPress }) => {
  const { colors, isDark } = useAppTheme();
  const { peer, lastMessage, lastMessageAt, unreadCount, isMuted } = conversation;

  const hasUnread = unreadCount > 0;
  const timeText = formatTime(lastMessageAt);

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Avatar
        uri={peer.avatarUrl}
        initials={peer.initials}
        size={52}
        isOnline={peer.isOnline}
      />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.name,
              { color: colors.text, fontWeight: hasUnread ? "700" : "600" },
            ]}
            numberOfLines={1}
          >
            {peer.name}
          </Text>

          <View style={styles.timeGroup}>
            {isMuted ? (
              <Text style={styles.mutedIcon}>🔕</Text>
            ) : null}
            {timeText ? (
              <Text
                style={[
                  styles.time,
                  { color: hasUnread ? colors.accent : colors.textMuted },
                ]}
              >
                {timeText}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.lastMessage,
              {
                color: hasUnread ? colors.text : colors.textMuted,
                fontWeight: hasUnread ? "600" : "400",
              },
            ]}
            numberOfLines={2}
          >
            {lastMessage || "Tap to chat"}
          </Text>

          {hasUnread ? (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const ConversationRow = memo(ConversationRowComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.3,
  },
  timeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mutedIcon: {
    fontSize: 12,
  },
  time: {
    fontSize: 12,
    fontWeight: "400",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
    lineHeight: 18,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
