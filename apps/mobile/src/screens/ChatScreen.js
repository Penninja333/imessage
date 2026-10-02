import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import NicknameModal from '../components/NicknameModal';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function ChatScreen({ navigation }) {
  const { colors } = useAppTheme();

  const authUser = useAuthStore((state) => state.authUser);
  const onlineUsers = useAuthStore((state) => state.onlineUsers);
  const selectedUser = useChatStore((state) => state.selectedUser);
  const messages = useChatStore((state) => state.messages);
  const isMessagesLoading = useChatStore((state) => state.isMessagesLoading);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const reactToMessage = useChatStore((state) => state.reactToMessage);
  const deleteMessage = useChatStore((state) => state.deleteMessage);
  const sendTyping = useChatStore((state) => state.sendTyping);
  const typingUsers = useChatStore((state) => state.typingUsers);

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null); // Message for reaction popover

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isOnline = selectedUser && onlineUsers.includes(selectedUser._id);
  const isRecipientTyping = selectedUser && !!typingUsers[selectedUser._id];
  const displayName =
    selectedUser?.nickname || selectedUser?.fullName || selectedUser?.username || 'Chat';

  useEffect(() => {
    return () => {
      sendTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleTextChange = (text) => {
    setInputText(text);

    if (text.trim().length > 0) {
      sendTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(false);
      }, 2000);
    } else {
      sendTyping(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setSelectedImage(`data:image/jpeg;base64,${asset.base64}`);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;
    setIsSending(true);

    try {
      await sendMessage({
        text: inputText.trim(),
        image: selectedImage || undefined,
      });

      setInputText('');
      setSelectedImage(null);
      sendTyping(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const renderMessageItem = ({ item }) => {
    // System messages (e.g. nickname changes)
    if (item.isSystem || item.type === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={[styles.systemMessageText, { color: colors.textMuted }]}>
            {item.text}
          </Text>
        </View>
      );
    }

    const isMine = item.senderId === authUser?._id;
    const isDeleted = !!item.isDeleted;

    // Aggregate reactions
    const reactionCounts = {};
    if (item.reactions && item.reactions.length > 0) {
      item.reactions.forEach((r) => {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
      });
    }

    return (
      <View style={[styles.messageRow, isMine ? styles.myRow : styles.theirRow]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => {
            if (!isDeleted) {
              setActiveMessageMenu(item);
            }
          }}
          style={[
            styles.bubble,
            isMine
              ? [styles.myBubble, { backgroundColor: colors.bubbleSent }]
              : [styles.theirBubble, { backgroundColor: colors.bubbleReceived }],
          ]}
        >
          {item.image && !isDeleted ? (
            <Image source={{ uri: item.image }} style={styles.messageImage} />
          ) : null}

          <Text
            style={[
              styles.messageText,
              isMine
                ? { color: colors.bubbleSentText }
                : { color: colors.bubbleReceivedText },
              isDeleted ? styles.deletedText : null,
            ]}
          >
            {isDeleted ? 'This message was deleted' : item.text}
          </Text>

          <Text
            style={[
              styles.timestamp,
              {
                color: isMine ? 'rgba(255,255,255,0.7)' : colors.textMuted,
                alignSelf: isMine ? 'flex-end' : 'flex-start',
              },
            ]}
          >
            {item.createdAt
              ? new Date(item.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </Text>

          {/* Reactions badge */}
          {Object.keys(reactionCounts).length > 0 && !isDeleted ? (
            <View
              style={[
                styles.reactionsBadge,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                },
              ]}
            >
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <Text key={emoji} style={styles.reactionText}>
                  {emoji} {count > 1 ? count : ''}
                </Text>
              ))}
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '500' }}>‹ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerTitleContainer}
          activeOpacity={0.7}
          onPress={() => setNicknameModalVisible(true)}
        >
          <View style={styles.headerAvatarContainer}>
            <Image
              source={{
                uri:
                  selectedUser?.profilePic ||
                  `https://api.dicebear.com/7.x/bottts/png?seed=${selectedUser?._id}`,
              }}
              style={styles.headerAvatar}
            />
            {isOnline ? <View style={styles.onlineDot} /> : null}
          </View>
          <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]} numberOfLines={1}>
            {isRecipientTyping
              ? 'typing…'
              : selectedUser?.theirNicknameForMe
              ? `Calls you "${selectedUser.theirNicknameForMe}"`
              : isOnline
              ? 'Online'
              : 'Tap for details'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.infoBtn, { backgroundColor: colors.surface }]}
          onPress={() => setNicknameModalVisible(true)}
        >
          <Text style={{ fontSize: 16 }}>ℹ️</Text>
        </TouchableOpacity>
      </View>

      {/* Message List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.chatArea}
      >
        {isMessagesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item._id || String(index)}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Typing indicator bubble */}
        {isRecipientTyping ? (
          <View style={[styles.typingBubble, { backgroundColor: colors.bubbleReceived }]}>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
              {selectedUser?.nickname || selectedUser?.fullName || 'Contact'} is typing...
            </Text>
          </View>
        ) : null}

        {/* Image Attachment Preview */}
        {selectedImage ? (
          <View style={[styles.previewBar, { backgroundColor: colors.surface }]}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            <TouchableOpacity
              style={[styles.removeImageBtn, { backgroundColor: colors.danger }]}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Input Bar */}
        <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
            <Text style={{ fontSize: 22 }}>📷</Text>
          </TouchableOpacity>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="iMessage"
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  inputText.trim().length > 0 || selectedImage
                    ? colors.primary
                    : colors.surface,
              },
            ]}
            onPress={handleSend}
            disabled={(!inputText.trim() && !selectedImage) || isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Reaction & Action Popover Modal */}
      {activeMessageMenu ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setActiveMessageMenu(null)}>
          <TouchableOpacity
            style={styles.popoverOverlay}
            activeOpacity={1}
            onPress={() => setActiveMessageMenu(null)}
          >
            <View style={[styles.popoverCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.emojiRow}>
                {REACTION_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiBtn}
                    onPress={() => {
                      reactToMessage(activeMessageMenu._id, emoji);
                      setActiveMessageMenu(null);
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {activeMessageMenu.senderId === authUser?._id && !activeMessageMenu.isDeleted ? (
                <TouchableOpacity
                  style={[styles.deleteMenuBtn, { borderTopColor: colors.border }]}
                  onPress={() => {
                    deleteMessage(activeMessageMenu._id);
                    setActiveMessageMenu(null);
                  }}
                >
                  <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 15 }}>
                    Delete Message
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>
        </Modal>
      ) : null}

      <NicknameModal
        visible={nicknameModalVisible}
        onClose={() => setNicknameModalVisible(false)}
        user={selectedUser}
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 6,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerAvatarContainer: {
    position: 'relative',
    marginBottom: 2,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#34C759',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 11,
  },
  infoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  messageRow: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  theirRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    position: 'relative',
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  deletedText: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  reactionsBadge: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
  },
  reactionText: {
    fontSize: 11,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  systemMessageText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  typingBubble: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  previewImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  removeImageBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachBtn: {
    padding: 6,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    marginHorizontal: 8,
    fontSize: 15,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popoverCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emojiBtn: {
    padding: 4,
  },
  deleteMenuBtn: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
});
