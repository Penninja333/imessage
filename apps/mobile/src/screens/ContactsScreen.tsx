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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAppTheme } from "../theme/ThemeContext";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Avatar } from "../components/common/Avatar";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { PeerProfile } from "../utils/normalize";

type Props = NativeStackScreenProps<RootStackParamList, "Contacts">;

function ContactsContent({ navigation }: Props) {
  const { colors, isDark } = useAppTheme();
  const { users, isLoadingUsers, loadUsers } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadUsers(onlineUsers);
  }, [loadUsers, onlineUsers]);

  // Exclude self from contact list
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const otherUsers = users.filter((u) => String(u.id) !== String(authUser?._id));
    if (!q) return otherUsers;
    return otherUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.subtitle.toLowerCase().includes(q) ||
        (u.nickname && u.nickname.toLowerCase().includes(q))
    );
  }, [users, search, authUser?._id]);

  const handleSelectContact = (contact: PeerProfile) => {
    navigation.replace("ChatRoom", {
      conversationId: contact.id,
      peerName: contact.name,
    });
  };

  const renderContactItem = ({ item }: { item: PeerProfile }) => (
    <TouchableOpacity
      style={[styles.contactRow, { borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}
      onPress={() => handleSelectContact(item)}
      activeOpacity={0.7}
    >
      <Avatar
        uri={item.avatarUrl}
        initials={item.initials}
        size={46}
        isOnline={item.isOnline}
      />
      <View style={styles.contactInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.nickname ? (
            <View style={[styles.nickBadge, { backgroundColor: colors.accent + "20" }]}>
              <Text style={[styles.nickText, { color: colors.accent }]}>NICK</Text>
            </View>
          ) : null}
        </View>
        {item.subtitle ? (
          <Text style={[styles.contactEmail, { color: colors.textMuted }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Modal Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: colors.accent }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Message</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Input Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="To: Search name or email"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {isLoadingUsers && users.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderContactItem}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingUsers}
              onRefresh={() => loadUsers(onlineUsers)}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {search ? "No Contacts Found" : "No Other Users Yet"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {search
                  ? "Try searching with a different name or email."
                  : "Invite friends or create another user account to chat."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

export const ContactsScreen: React.FC<Props> = (props) => (
  <ErrorBoundary fallbackTitle="Contacts Unavailable">
    <ContactsContent {...props} />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  cancelText: {
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 50,
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
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
  },
  nickBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  nickText: {
    fontSize: 9,
    fontWeight: "700",
  },
  contactEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 36,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
