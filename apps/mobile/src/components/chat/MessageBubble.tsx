import React, { memo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActionSheetIOS,
  Platform,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { ApiMessage } from "../../api/messages";
import { useAppTheme } from "../../theme/ThemeContext";
import { TapbackPicker } from "./TapbackPicker";
import { MessageAudio } from "./MessageAudio";
import { DocumentCard } from "./DocumentCard";
import { ViewOnceCapsule } from "./ViewOnceCapsule";
import { Lightbox } from "../common/Lightbox";

interface Props {
  message: ApiMessage;
  isOwn: boolean;
  currentUserId?: string;
  onReply: (message: ApiMessage) => void;
  onEdit: (message: ApiMessage) => void;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
}

const MessageBubbleComponent: React.FC<Props> = ({
  message,
  isOwn,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReact,
}) => {
  const { colors, isDark } = useAppTheme();
  const [showTapback, setShowTapback] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const canEdit =
    isOwn &&
    !message.deleted &&
    Date.now() - new Date(message.createdAt).getTime() < 15 * 60 * 1000;

  const handleLongPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const options = ["Reply", "React"];
    if (canEdit) options.push("Edit");
    if (isOwn && !message.deleted) options.push("Delete");
    options.push("Cancel");

    const cancelButtonIndex = options.length - 1;
    const destructiveButtonIndex = isOwn && !message.deleted ? options.indexOf("Delete") : -1;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
        },
        (buttonIndex) => {
          const action = options[buttonIndex];
          if (action === "Reply") onReply(message);
          else if (action === "React") setShowTapback(true);
          else if (action === "Edit") onEdit(message);
          else if (action === "Delete") onDelete(message._id);
        }
      );
    } else {
      Alert.alert(
        "Message Options",
        undefined,
        options
          .filter((opt) => opt !== "Cancel")
          .map((opt) => ({
            text: opt,
            style: opt === "Delete" ? "destructive" : "default",
            onPress: () => {
              if (opt === "Reply") onReply(message);
              else if (opt === "React") setShowTapback(true);
              else if (opt === "Edit") onEdit(message);
              else if (opt === "Delete") onDelete(message._id);
            },
          })),
        { cancelable: true }
      );
    }
  };

  const bubbleBg = isOwn
    ? colors.accent
    : isDark
    ? colors.bubbleIncoming
    : "#E9E9EB";

  const textColor = isOwn
    ? "#FFFFFF"
    : isDark
    ? "#FFFFFF"
    : "#000000";

  const reactionsSummary =
    message.reactions && message.reactions.length > 0
      ? Array.from(new Set(message.reactions.map((r) => r.emoji))).join(" ")
      : null;

  return (
    <View style={[styles.wrapper, isOwn ? styles.wrapperRight : styles.wrapperLeft]}>
      <TouchableOpacity
        style={[styles.bubble, { backgroundColor: bubbleBg }]}
        onLongPress={handleLongPress}
        delayLongPress={300}
        activeOpacity={0.85}
      >
        {/* Reply Quote Header */}
        {message.replyTo ? (
          <View
            style={[
              styles.replyQuote,
              {
                backgroundColor: isOwn ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)",
                borderLeftColor: isOwn ? "#FFFFFF" : colors.accent,
              },
            ]}
          >
            <Text
              style={[styles.replyAuthor, { color: isOwn ? "#FFFFFF" : colors.accent }]}
              numberOfLines={1}
            >
              {message.replyTo.senderId === currentUserId ? "You" : "Reply"}
            </Text>
            <Text
              style={[
                styles.replyText,
                { color: isOwn ? "rgba(255,255,255,0.85)" : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {message.replyTo.text || "Media"}
            </Text>
          </View>
        ) : null}

        {/* Media / Attachment Routing */}
        {message.viewOnce ? (
          <ViewOnceCapsule
            messageId={message._id}
            viewedOnce={Boolean(message.viewedOnce)}
            isOwn={isOwn}
            initialImageUrl={message.image}
          />
        ) : message.image ? (
          <TouchableOpacity onPress={() => setShowLightbox(true)} activeOpacity={0.9}>
            <Image
              source={{ uri: message.image }}
              style={styles.mediaImage}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        ) : null}

        {message.audio ? (
          <MessageAudio uri={message.audio} isOwn={isOwn} />
        ) : null}

        {message.fileUrl ? (
          <DocumentCard
            fileUrl={message.fileUrl}
            fileName={message.fileName}
            fileSize={message.fileSize}
            fileType={message.fileType}
            isOwn={isOwn}
          />
        ) : null}

        {/* Text Message */}
        {message.text && (!message.viewOnce || !message.image) ? (
          <Text
            style={[
              styles.messageText,
              { color: textColor },
              message.deleted && styles.deletedText,
            ]}
          >
            {message.text}
          </Text>
        ) : null}

        {/* Metadata Footer: Timestamp + Edited Badge + Seen Status */}
        <View style={styles.metaRow}>
          {message.isEdited ? (
            <Text
              style={[
                styles.editedBadge,
                { color: isOwn ? "rgba(255,255,255,0.7)" : colors.textMuted },
              ]}
            >
              (edited)
            </Text>
          ) : null}

          <Text
            style={[
              styles.timeText,
              { color: isOwn ? "rgba(255,255,255,0.7)" : colors.textMuted },
            ]}
          >
            {formattedTime}
          </Text>

          {isOwn ? (
            <Text
              style={[
                styles.seenIcon,
                { color: message.seen ? "#FFFFFF" : "rgba(255,255,255,0.6)" },
              ]}
            >
              {message.seen ? "✓✓" : "✓"}
            </Text>
          ) : null}
        </View>

        {/* Reactions Chip Pill */}
        {reactionsSummary ? (
          <TouchableOpacity
            style={[
              styles.reactionPill,
              {
                backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
                borderColor: isDark ? "#38383A" : "#D1D1D6",
              },
            ]}
            onPress={() => setShowTapback(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionPillText}>{reactionsSummary}</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      <TapbackPicker
        visible={showTapback}
        activeReactions={message.reactions}
        currentUserId={currentUserId}
        onSelectReaction={(emoji) => onReact(message._id, emoji)}
        onClose={() => setShowTapback(false)}
      />

      <Lightbox
        visible={showLightbox}
        imageUrl={message.image}
        onClose={() => setShowLightbox(false)}
      />
    </View>
  );
};

export const MessageBubble = memo(MessageBubbleComponent);

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 3,
    paddingHorizontal: 12,
    flexDirection: "row",
  },
  wrapperRight: {
    justifyContent: "flex-end",
  },
  wrapperLeft: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 18,
    position: "relative",
  },
  mediaImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 4,
  },
  replyQuote: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  replyAuthor: {
    fontSize: 11,
    fontWeight: "700",
  },
  replyText: {
    fontSize: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 21,
    marginTop: 2,
  },
  deletedText: {
    fontStyle: "italic",
    opacity: 0.7,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 3,
    gap: 4,
  },
  editedBadge: {
    fontSize: 10,
    fontStyle: "italic",
  },
  timeText: {
    fontSize: 10,
  },
  seenIcon: {
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 2,
  },
  reactionPill: {
    position: "absolute",
    bottom: -10,
    left: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  reactionPillText: {
    fontSize: 12,
  },
});
