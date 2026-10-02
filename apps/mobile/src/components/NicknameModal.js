import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useChatStore } from '../store/useChatStore';

export default function NicknameModal({ visible, onClose, userId, currentNickname, peerName, theme, accent }) {
  const [value, setValue] = useState(currentNickname || '');
  const setNickname = useChatStore((s) => s.setNickname);

  const handleSave = async () => {
    await setNickname(userId, value.trim());
    onClose();
  };

  const handleClear = async () => {
    await setNickname(userId, '');
    setValue('');
    onClose();
  };

  const isDark = theme === 'dark';
  const bg = isDark ? '#1c1c1e' : '#fff';
  const fg = isDark ? '#fff' : '#000';
  const border = isDark ? '#333' : '#ddd';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { backgroundColor: bg }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: fg }]}>Nickname for {peerName}</Text>
          <Text style={[styles.subtitle, { color: isDark ? '#888' : '#555' }]}>
            Only you see this nickname. Your friend can set their own nickname for you.
          </Text>

          <TextInput
            style={[styles.input, { color: fg, borderColor: border, backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5' }]}
            value={value}
            onChangeText={setValue}
            placeholder={`Nickname for ${peerName}…`}
            placeholderTextColor="#888"
            maxLength={32}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <View style={styles.actions}>
            {currentNickname ? (
              <TouchableOpacity style={[styles.btn, styles.clearBtn]} onPress={handleClear}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.btn, styles.cancelBtn, { borderColor: border }]} onPress={onClose}>
              <Text style={[styles.cancelBtnText, { color: fg }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: accent }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
  },
  clearBtn: { backgroundColor: '#ff3b30' },
  clearBtnText: { color: '#fff', fontWeight: '600' },
  cancelBtn: { borderWidth: 1 },
  cancelBtnText: { fontWeight: '600' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
