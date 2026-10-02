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

export default function NicknameModal({ visible, onClose, userId, currentNickname, peerNicknameForMe, peerName, theme, accent }) {
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
  const cardBg = isDark ? '#2c2c2e' : '#f2f2f7';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { backgroundColor: bg }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: fg }]}>Chat Nicknames</Text>
          <Text style={[styles.subtitle, { color: isDark ? '#888' : '#555' }]}>
            Shared nicknames between you and {peerName}.
          </Text>

          {/* Section: What they call you */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.cardLabel, { color: isDark ? '#aaa' : '#666' }]}>
              WHAT {peerName.toUpperCase()} CALLS YOU
            </Text>
            <Text style={[styles.cardValue, { color: fg }]}>
              {peerNicknameForMe ? `"${peerNicknameForMe}"` : '(No nickname set for you yet)'}
            </Text>
          </View>

          {/* Section: Your nickname for them */}
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.inputLabel, { color: isDark ? '#aaa' : '#666' }]}>
              YOUR NICKNAME FOR {peerName.toUpperCase()}
            </Text>
            <TextInput
              style={[styles.input, { color: fg, borderColor: border, backgroundColor: cardBg }]}
              value={value}
              onChangeText={setValue}
              placeholder={`Nickname for ${peerName}…`}
              placeholderTextColor="#888"
              maxLength={32}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

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
    marginBottom: 16,
    lineHeight: 18,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
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
