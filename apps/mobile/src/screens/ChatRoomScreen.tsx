import React, { useEffect, useMemo, useState } from "react";
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
import { PinnedBanner } from "../components/chat/PinnedBanner";
import { InChatSearch } from "../components/chat/InChatSearch";
import { ChatThemePicker } from "../components/chat/ChatThemePicker";
import { ContactDetailsModal } from "../components/chat/ContactDetailsModal";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { resolveChatTheme } from "../theme/chatThemes";

type Props = NativeStackScreenProps<RootStackParamList, "ChatRoom">;

function ChatRoomContent({ route, navigation }: Props) {
  const { conversationId, peerName: initialPeerName } = route.params;
  const { colors, isDark } = useAppTheme();

  const authUser = useAuthStore((s) => s.authUser);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);

  const {
    messages,
    pinnedMessages,
    currentTheme,
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
    togglePin,
    toggleStar,
    updateTheme,
  } = useChatStore();

  const [showSearch, setShowSearch] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);

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

  const activeTheme = resolveChatTheme(currentTheme);
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
            <Text style={[styles.backIcon, { color: activeTheme.tintColor }]}>‹</Text>
            <Text style={[styles.backText, { color: activeTheme.tintColor }]}>Messages</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.peerHeader}
            onPress={() => setShowContactDetails(true)}
            activeOpacity={0.7}
          >
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
          </TouchableOpacity>

          {/* Header Action Buttons (Search & Contact Info) */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowSearch((prev) => !prev)}
              style={styles.iconBtn}
            >
              <Text style={styles.actionIcon}>🔍</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowContactDetails(true)}
              style={styles.iconBtn}
            >
              <Text style={[styles.infoIcon, { color: activeTheme.tintColor }]}>ⓘ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* In-Chat Search Bar */}
        {showSearch ? (
          <InChatSearch
            messages={messages}
            onSelectMatch={(id) => {
              // Focused match
            }}
            onClose={() => setShowSearch(false)}
          />
        ) : null}

        {/* Pinned Messages Banner */}
        {!showSearch && pinnedMessages.length > 0 ? (
          <PinnedBanner
            pinnedMessages={pinnedMessages}
            onPressMessage={(id) => {
              // Jump or preview message
            }}
            onUnpin={(id) => togglePin(id)}
          />
        ) : null}

        {/* Message Thread */}
        {isLoadingMessages && messages.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={activeTheme.tintColor} />
          </View>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={authUser?._id}
            isPartnerTyping={isPartnerTyping}
            isLoadingOlder={isLoadingOlder}
            customBubbleColor={activeTheme.bubbleColor}
            onLoadOlder={() => loadOlderMessages(conversationId)}
            onReply={setReplyingTo}
            onEdit={setEditingMessage}
            onDelete={deleteMessage}
            onReact={toggleReaction}
            onTogglePin={togglePin}
            onToggleStar={toggleStar}
          />
        )}

        {/* Composer */}
        <ChatComposer receiverId={conversationId} />

        {/* Theme Picker Modal */}
        <ChatThemePicker
          visible={showThemePicker}
          currentThemeId={currentTheme}
          onSelectTheme={(themeId) => updateTheme(conversationId, themeId)}
          onClose={() => setShowThemePicker(false)}
        />

        {/* Contact Details Modal */}
        <ContactDetailsModal
          visible={showContactDetails}
          peer={peer}
          messages={messages}
          currentTheme={currentTheme}
          onClose={() => setShowContactDetails(false)}
          onOpenThemePicker={() => setShowThemePicker(true)}
          onOpenSearch={() => setShowSearch(true)}
        />
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
    maxWidth: "46%",
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    padding: 6,
  },
  actionIcon: {
    fontSize: 16,
  },
  infoIcon: {
    fontSize: 20,
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
