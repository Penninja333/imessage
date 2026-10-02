import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import ThemePickerModal from '../components/ThemePickerModal';

function Avatar({ name, avatarUrl, isOnline, size = 46 }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <View style={{ position: 'relative', width: size, height: size }}>
      <View style={[styles.avatarBase, { width: size, height: size, borderRadius: size / 2 }]}>
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
          : <Text style={[styles.avatarInitials, { fontSize: size * 0.36 }]}>{initials}</Text>
        }
      </View>
      {isOnline && (
        <View style={[styles.onlineDot, { width: size * 0.26, height: size * 0.26, borderRadius: size * 0.13, bottom: 0, right: 0 }]} />
      )}
    </View>
  );
}

export default function ChatListScreen({ navigation }) {
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'people'
  const [showThemePicker, setShowThemePicker] = useState(false);

  const getUsers = useChatStore((s) => s.getUsers);
  const getConversations = useChatStore((s) => s.getConversations);
  const conversations = useChatStore((s) => s.conversations);
  const users = useChatStore((s) => s.users);
  const isConversationsLoading = useChatStore((s) => s.isConversationsLoading);
  const isUsersLoading = useChatStore((s) => s.isUsersLoading);

  const authUser = useAuthStore((s) => s.authUser);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);

  useEffect(() => {
    getUsers();
    getConversations();
  }, []);

  const bg = isDark ? '#000' : '#f2f2f7';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const fg = isDark ? '#fff' : '#000';
  const mutedFg = isDark ? '#8e8e93' : '#6e6e73';
  const borderColor = isDark ? '#2c2c2e' : '#e5e5ea';

  const listSource = activeTab === 'chats' ? conversations : users;
  const filtered = listSource.filter((u) => {
    const name = u.nickname || u.myNickname || u.fullName || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const loading = activeTab === 'chats' ? isConversationsLoading : isUsersLoading;

  const renderItem = useCallback(({ item }) => {
    const displayName = item.nickname || item.myNickname || item.fullName || 'Unknown';
    const isOnline = onlineUsers.includes(item._id);
    const hasNickname = !!item.nickname;

    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: cardBg, borderBottomColor: borderColor }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Chat', {
          userId: item._id,
          name: displayName,
          avatarUrl: item.profilePic,
          nickname: item.nickname || null,
          myNickname: item.myNickname || null,
          fullName: item.fullName,
        })}
      >
        <Avatar name={displayName} avatarUrl={item.profilePic} isOnline={isOnline} />
        <View style={styles.rowContent}>
          <View style={styles.rowNameRow}>
            <Text style={[styles.rowName, { color: fg }]} numberOfLines={1}>{displayName}</Text>
            {hasNickname && (
              <View style={[styles.nickBadge, { backgroundColor: accent + '22' }]}>
                <Text style={[styles.nickBadgeText, { color: accent }]}>nick</Text>
              </View>
            )}
          </View>
          {isOnline
            ? <Text style={[styles.onlineLabel, { color: accent }]}>Online</Text>
            : <Text style={[styles.offlineLabel, { color: mutedFg }]}>Offline</Text>
          }
        </View>
      </TouchableOpacity>
    );
  }, [onlineUsers, isDark, accent, fg, mutedFg, cardBg, borderColor]);

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: fg }]}>iMessage</Text>
        <TouchableOpacity onPress={() => setShowThemePicker(true)} style={styles.headerBtn}>
          <Text style={{ fontSize: 20 }}>🎨</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: cardBg }]}>
        <TextInput
          style={[styles.searchInput, { color: fg }]}
          placeholder="Search"
          placeholderTextColor={mutedFg}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: mutedFg, fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        {['chats', 'people'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && [styles.tabActive, { borderBottomColor: accent }]]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, { color: activeTab === tab ? accent : mutedFg }]}>
              {tab === 'chats' ? '💬 Chats' : '👥 People'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={accent} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          style={{ backgroundColor: cardBg }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: mutedFg }]}>
              {search ? 'No results.' : activeTab === 'chats' ? 'No conversations yet.' : 'No users found.'}
            </Text>
          }
        />
      )}

      <ThemePickerModal visible={showThemePicker} onClose={() => setShowThemePicker(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerBtn: { padding: 6 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 16 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabLabel: { fontSize: 14, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatarBase: { backgroundColor: '#555', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarInitials: { color: '#fff', fontWeight: '700' },
  onlineDot: { position: 'absolute', backgroundColor: '#34C759', borderWidth: 2, borderColor: '#fff' },
  rowContent: { flex: 1 },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  rowName: { fontSize: 16, fontWeight: '600', flex: 1 },
  nickBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  nickBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  onlineLabel: { fontSize: 13, fontWeight: '600' },
  offlineLabel: { fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 15 },
});
