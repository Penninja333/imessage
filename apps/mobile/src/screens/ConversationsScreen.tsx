import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAppTheme } from "../theme/ThemeContext";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { ConversationRow } from "../components/chat/ConversationRow";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { ConversationItem } from "../utils/normalize";

type Props = NativeStackScreenProps<RootStackParamList, "Conversations">;

function ConversationsContent({ navigation }: Props) {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { colors } = useAppTheme();

  const { authUser, onlineUsers, syncAuthUser, clearAuth } = useAuthStore();
  const {
    conversations,
    isLoadingConversations,
    loadConversations,
    setActiveConversationId,
  } = useChatStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    syncAuthUser();
    loadConversations(onlineUsers);
  }, [syncAuthUser, loadConversations, onlineUsers]);

  const handleSignOut = async () => {
    clearAuth();
    await signOut();
  };

  const handleOpenConversation = (conversation: ConversationItem) => {
    setActiveConversationId(conversation.conversationId);
    navigation.navigate("ChatRoom", {
      conversationId: conversation.conversationId,
      peerName: conversation.peer.name,
    });
  };

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.peer.name.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  const displayName =
    authUser?.fullName || user?.fullName || user?.primaryEmailAddress?.emailAddress || "Me";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* iOS Large Title Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleSignOut} style={styles.navButton}>
            <Text style={[styles.navButtonText, { color: colors.accent }]}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("Contacts")}
            style={styles.newButton}
          >
            <Text style={[styles.newButtonText, { color: colors.accent }]}>New</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.largeTitle, { color: colors.text }]}>Messages</Text>
        <Text style={[styles.profileSubtitle, { color: colors.textMuted }]}>
          Logged in as {displayName}
        </Text>
      </View>

      {/* In-List Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search messages"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {isLoadingConversations && conversations.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              onPress={() => handleOpenConversation(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingConversations}
              onRefresh={() => loadConversations(onlineUsers)}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
                <Text style={styles.emptyIcon}>💬</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {search ? "No Messages Found" : "No Conversations Yet"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {search
                  ? "Try searching for a different phrase or contact name."
                  : "Tap New in the top right to start a conversation with any registered contact."}
              </Text>
              {!search ? (
                <TouchableOpacity
                  style={[styles.startChatButton, { backgroundColor: colors.accent }]}
                  onPress={() => navigation.navigate("Contacts")}
                >
                  <Text style={styles.startChatButtonText}>Start a Conversation</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

export const ConversationsScreen: React.FC<Props> = (props) => (
  <ErrorBoundary fallbackTitle="Messages Unavailable">
    <ConversationsContent {...props} />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  navButton: {
    paddingVertical: 4,
  },
  navButtonText: {
    fontSize: 16,
  },
  newButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  newButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  profileSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 36,
    paddingTop: 60,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 34,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  startChatButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  startChatButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
