import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useClerk } from '@clerk/clerk-expo';
import { useAppTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import ThemePickerModal from '../components/ThemePickerModal';

export default function ChatListScreen({ navigation }) {
  const { colors, theme } = useAppTheme();
  const { signOut } = useClerk();

  const authUser = useAuthStore((state) => state.authUser);
  const onlineUsers = useAuthStore((state) => state.onlineUsers);
  const users = useChatStore((state) => state.users);
  const isUsersLoading = useChatStore((state) => state.isUsersLoading);
  const getUsers = useChatStore((state) => state.getUsers);
  const setSelectedUser = useChatStore((state) => state.setSelectedUser);
  const typingUsers = useChatStore((state) => state.typingUsers);

  const [searchQuery, setSearchQuery] = useState('');
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  useEffect(() => {
    getUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.nickname && u.nickname.toLowerCase().includes(q)) ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const renderUserItem = ({ item }) => {
    const isOnline = onlineUsers.includes(item._id);
    const isTyping = !!typingUsers[item._id];
    const displayName = item.nickname || item.fullName || item.username || 'Contact';

    return (
      <TouchableOpacity
        style={[styles.userRow, { borderBottomColor: colors.border }]}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedUser(item);
          navigation.navigate('Chat');
        }}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                item.profilePic ||
                `https://api.dicebear.com/7.x/bottts/png?seed=${item._id || item.username}`,
            }}
            style={[styles.avatar, { backgroundColor: colors.surface }]}
          />
          {isOnline ? <View style={styles.onlineDot} /> : null}
        </View>

        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            {item.nickname ? (
              <View style={[styles.tagBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>Nickname</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.lastMessage, { color: isTyping ? colors.primary : colors.textMuted }]} numberOfLines={1}>
            {isTyping ? 'typing…' : item.theirNicknameForMe ? `Calls you "${item.theirNicknameForMe}"` : `@${item.username || 'user'}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface }]}
            onPress={() => setThemeModalVisible(true)}
          >
            <Text style={{ fontSize: 16 }}>🎨</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface }]}
            onPress={() => signOut()}
          >
            <Text style={{ fontSize: 16 }}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.inputBg,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Search contacts or nicknames..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Conversation List */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isUsersLoading}
            onRefresh={getUsers}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isUsersLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Conversations Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {searchQuery ? 'No contacts match your search' : 'Your contacts will appear here'}
              </Text>
            </View>
          ) : null
        }
      />

      <ThemePickerModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  listContent: {
    flexGrow: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#000',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});
