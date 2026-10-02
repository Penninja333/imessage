import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { useChatStore } from '../store/useChatStore';

export default function NicknameModal({ visible, onClose, user }) {
  const { colors } = useAppTheme();
  const [nicknameInput, setNicknameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setNickname = useChatStore((state) => state.setNickname);

  useEffect(() => {
    if (user) {
      setNicknameInput(user.nickname || '');
    }
  }, [user, visible]);

  if (!user) return null;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await setNickname(user._id, nicknameInput.trim());
      onClose();
    } catch (err) {
      console.warn('Failed to save nickname', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    setIsLoading(true);
    try {
      await setNickname(user._id, '');
      setNicknameInput('');
      onClose();
    } catch (err) {
      console.warn('Failed to clear nickname', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Chat Nicknames</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Personalize contact names for both sides of the conversation
          </Text>

          {/* Section 1: Nickname for them */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              Your nickname for {user.fullName || user.username || 'this user'}:
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Enter custom nickname..."
              placeholderTextColor={colors.textMuted}
              value={nicknameInput}
              onChangeText={setNicknameInput}
              maxLength={32}
              autoCapitalize="words"
            />
          </View>

          {/* Section 2: Their nickname for me */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              Their nickname for you:
            </Text>
            <View style={[styles.readOnlyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: user.theirNicknameForMe ? colors.text : colors.textMuted, fontStyle: user.theirNicknameForMe ? 'normal' : 'italic' }}>
                {user.theirNicknameForMe ? `"${user.theirNicknameForMe}"` : 'No nickname set for you'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.buttonRow}>
            {user.nickname ? (
              <TouchableOpacity
                style={[styles.btn, styles.clearBtn, { borderColor: colors.danger }]}
                onPress={handleClear}
                disabled={isLoading}
              >
                <Text style={{ color: colors.danger, fontWeight: '600' }}>Reset</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={{ color: colors.text, fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  readOnlyBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  btn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    minWidth: 70,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  clearBtn: {
    borderWidth: 1,
    marginRight: 'auto',
  },
});
