import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { axiosInstance } from '../lib/axios';
import NicknameModal from '../components/NicknameModal';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function ChatScreen({ route, navigation }) {
  const { userId, name, avatarUrl, nickname, myNickname, fullName } = route.params;
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';

  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showNickname, setShowNickname] = useState(false);
  const flatRef = useRef(null);

  const authUser = useAuthStore((s) => s.authUser);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);
  const getMessages = useChatStore((s) => s.getMessages);
  const subscribeToMessages = useChatStore((s) => s.subscribeToMessages);
  const unsubscribeFromMessages = useChatStore((s) => s.unsubscribeFromMessages);
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const setComposerText = useChatStore((s) => s.setComposerText);
  const sendTextMessage = useChatStore((s) => s.sendTextMessage);
  const messages = useChatStore((s) => s.messages);
  const isMessagesLoading = useChatStore((s) => s.isMessagesLoading);

  const isOnline = onlineUsers.includes(userId);

  // The name visible to me: nickname I set for them (from myNickname) or the name passed in
  const displayName = name;

  useEffect(() => {
    setActiveConversationId(userId);
    getMessages(userId);
    subscribeToMessages(userId);
    return () => {
      unsubscribeFromMessages();
      setActiveConversationId(null);
    };
  }, [userId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setComposerText(trimmed);
    await sendTextMessage();
    setText('');
  };

  const handlePickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('media', {
      uri: asset.uri,
      type: asset.mimeType || 'image/jpeg',
      name: asset.fileName || 'media.jpg',
    });

    setUploading(true);
    try {
      await axiosInstance.post(`/messages/send/${userId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      getMessages(userId);
    } catch (e) {
      console.error('Media upload failed', e);
    } finally {
      setUploading(false);
    }
  };

  const bg = isDark ? '#000' : '#f2f2f7';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const fg = isDark ? '#fff' : '#000';
  const mutedFg = isDark ? '#8e8e93' : '#6e6e73';
  const inputBg = isDark ? '#2c2c2e' : '#f0f0f5';

  const renderMessage = useCallback(({ item }) => {
    const isMe = String(item.senderId) === String(authUser?._id);
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={[styles.msgImage, isMe ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }]} />
        ) : null}
        {item.text ? (
          <View style={[
            styles.bubble,
            isMe ? [styles.bubbleMe, { backgroundColor: accent }] : [styles.bubbleThem, { backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea' }]
          ]}>
            <Text style={[styles.bubbleText, { color: isMe ? '#fff' : fg }]}>{item.text}</Text>
          </View>
        ) : null}
        <Text style={[styles.msgTime, { color: mutedFg }, isMe ? { alignSelf: 'flex-end' } : {}]}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    );
  }, [authUser, accent, isDark, fg, mutedFg]);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: accent, fontSize: 16 }}>‹ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerCenter} onPress={() => setShowNickname(true)}>
          <Text style={[styles.headerName, { color: fg }]} numberOfLines={1}>{displayName}</Text>
          <Text style={[styles.headerStatus, { color: isOnline ? accent : mutedFg }]}>
            {isOnline ? 'Online' : 'Offline'} · tap to set nickname
          </Text>
        </TouchableOpacity>

        <View style={{ width: 64 }} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isMessagesLoading ? (
          <ActivityIndicator style={{ flex: 1 }} color={accent} />
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.msgList}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: cardBg, paddingBottom: insets.bottom || 12 }]}>
          <TouchableOpacity style={styles.mediaBtn} onPress={handlePickMedia} disabled={uploading}>
            <Text style={{ color: accent, fontSize: 22 }}>{uploading ? '⏳' : '📎'}</Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: fg, backgroundColor: inputBg }]}
            value={text}
            onChangeText={setText}
            placeholder="iMessage"
            placeholderTextColor={mutedFg}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />

          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() ? accent : (isDark ? '#333' : '#ddd') }]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Nickname modal */}
      <NicknameModal
        visible={showNickname}
        onClose={() => setShowNickname(false)}
        userId={userId}
        currentNickname={myNickname || null}
        peerNicknameForMe={nickname || null}
        peerName={fullName || name}
        theme={theme}
        accent={accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
    gap: 8,
  },
  backBtn: { width: 64, paddingVertical: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName: { fontSize: 17, fontWeight: '700' },
  headerStatus: { fontSize: 12, marginTop: 2 },
  msgList: { padding: 12, gap: 4 },
  msgRow: { marginBottom: 6 },
  msgRowRight: { alignItems: 'flex-end' },
  msgRowLeft: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  msgImage: { width: 220, height: 160, borderRadius: 14, marginBottom: 4 },
  msgTime: { fontSize: 11, marginTop: 3, marginHorizontal: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#333',
  },
  mediaBtn: { padding: 8, alignSelf: 'flex-end', marginBottom: 2 },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
