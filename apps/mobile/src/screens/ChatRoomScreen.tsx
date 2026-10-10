import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAppTheme } from "../theme/ThemeContext";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Avatar } from "../components/common/Avatar";
import { MessageList } from "../components/chat/MessageList";
import { ChatComposer } from "../components/chat/ChatComposer";
import { ErrorBoundary } from "../components/common/ErrorBoundary";

type Props = NativeStackScreenProps<RootStackParamList, "ChatRoom">;

function ChatRoomContent({ route, navigation }: Props) {
  const { conversationId, peerName: initialPeerName } = route.params;
  const { colors, isDark } = useAppTheme();

  const authUser = useAuthStore((s) => s.authUser);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);

  const {
    messages,
    isLoadingMessages,
    isLoadingOlder,
    typingUser,
    users,
    conversations,
    loadOlderMessages,
    setActiveConversationId,
    setReplyingTo,
    setEditingMessage,
    deleteMessage,
    toggleReaction,
  } = useChatStore();

  useEffect(() => {
    setActiveConversationId(conversationId);
    return () => {
      setActiveConversationId(null);
    };
  }, [conversationId, setActiveConversationId]);

  // Resolve peer contact details
  const peer = useMemo(() => {
    const foundUser = users.find((u) => String(u.id) === String(conversationId));
    if (foundUser) return foundUser;
    const foundConv = conversations.find((c) => String(c.conversationId) === String(conversationId));
    if (foundConv) return foundConv.peer;
    return {
      id: conversationId,
      name: initialPeerName || "Chat",
      fullName: initialPeerName || "Chat",
      nickname: null,
      subtitle: "",
      avatarUrl: "",
      initials: initialPeerName ? initialPeerName.slice(0, 2).toUpperCase() : "??",
      isOnline: onlineUsers.some((oid) => String(oid) === String(conversationId)),
    };
  }, [conversationId, users, conversations, initialPeerName, onlineUsers]);

  const isPartnerTyping = String(typingUser) === String(conversationId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Navigation Bar */}
        <View style={[styles.header, { borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backIcon, { color: colors.accent }]}>‹</Text>
            <Text style={[styles.backText, { color: colors.accent }]}>Messages</Text>
          </TouchableOpacity>

          <View style={styles.peerHeader}>
            <Avatar
              uri={peer.avatarUrl}
              initials={peer.initials}
              size={34}
              isOnline={peer.isOnline}
            />
            <View style={styles.peerTextGroup}>
              <Text style={[styles.peerName, { color: colors.text }]} numberOfLines={1}>
                {peer.name}
              </Text>
              <Text style={[styles.peerStatus, { color: colors.textMuted }]}>
                {isPartnerTyping ? "typing..." : peer.isOnline ? "Online" : ""}
              </Text>
            </View>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* Message Thread */}
        {isLoadingMessages && messages.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={authUser?._id}
            isPartnerTyping={isPartnerTyping}
            isLoadingOlder={isLoadingOlder}
            onLoadOlder={() => loadOlderMessages(conversationId)}
            onReply={setReplyingTo}
            onEdit={setEditingMessage}
            onDelete={deleteMessage}
            onReact={toggleReaction}
          />
        )}

        {/* Composer */}
        <ChatComposer receiverId={conversationId} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const ChatRoomScreen: React.FC<Props> = (props) => (
  <ErrorBoundary fallbackTitle="Chat Unavailable">
    <ChatRoomContent {...props} />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingRight: 8,
  },
  backIcon: {
    fontSize: 28,
    lineHeight: 28,
    marginTop: -2,
    marginRight: 2,
  },
  backText: {
    fontSize: 17,
  },
  peerHeader: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "50%",
    gap: 8,
  },
  peerTextGroup: {
    alignItems: "flex-start",
  },
  peerName: {
    fontSize: 15,
    fontWeight: "700",
  },
  peerStatus: {
    fontSize: 11,
    height: 14,
  },
  headerSpacer: {
    width: 60,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
