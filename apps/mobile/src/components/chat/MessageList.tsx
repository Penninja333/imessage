import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { ApiMessage } from "../../api/messages";
import { MessageBubble } from "./MessageBubble";
import { useAppTheme } from "../../theme/ThemeContext";

interface Props {
  messages: ApiMessage[];
  currentUserId?: string;
  isPartnerTyping: boolean;
  isLoadingOlder: boolean;
  customBubbleColor?: string;
  onLoadOlder: () => void;
  onReply: (message: ApiMessage) => void;
  onEdit: (message: ApiMessage) => void;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onTogglePin?: (messageId: string) => void;
  onToggleStar?: (messageId: string) => void;
}

export const MessageList: React.FC<Props> = ({
  messages,
  currentUserId,
  isPartnerTyping,
  isLoadingOlder,
  customBubbleColor,
  onLoadOlder,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onTogglePin,
  onToggleStar,
}) => {
  const { colors, isDark } = useAppTheme();

  // Inverted list requires reversing the array so newest is at index 0 (bottom of screen)
  const invertedMessages = useMemo(() => {
    return [...messages].reverse();
  }, [messages]);

  const renderItem = useCallback(
    ({ item }: { item: ApiMessage }) => {
      const isOwn = String(item.senderId) === String(currentUserId);
      return (
        <MessageBubble
          message={item}
          isOwn={isOwn}
          currentUserId={currentUserId}
          customBubbleColor={customBubbleColor}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onReact={onReact}
          onTogglePin={onTogglePin}
          onToggleStar={onToggleStar}
        />
      );
    },
    [currentUserId, customBubbleColor, onReply, onEdit, onDelete, onReact, onTogglePin, onToggleStar]
  );

  return (
    <View style={styles.container}>
      <FlashList
        data={invertedMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item._id || item.tempId || String(Math.random())}
        estimatedItemSize={64}
        inverted
        onEndReached={onLoadOlder}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingOlder ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          isPartnerTyping ? (
            <View style={styles.typingContainer}>
              <View
                style={[
                  styles.typingBubble,
                  { backgroundColor: isDark ? colors.bubbleIncoming : "#E9E9EB" },
                ]}
              >
                <Text style={[styles.typingDots, { color: colors.textMuted }]}>
                  Typing...
                </Text>
              </View>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 12,
  },
  loaderContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "flex-start",
  },
  typingBubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  typingDots: {
    fontSize: 13,
    fontStyle: "italic",
  },
});
