import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const PRESETS = [
  { id: 'blue',    label: 'Ocean',    accent: '#0a7ea4' },
  { id: 'purple',  label: 'Grape',    accent: '#7e14ff' },
  { id: 'green',   label: 'Forest',   accent: '#34C759' },
  { id: 'red',     label: 'Crimson',  accent: '#FF3B30' },
  { id: 'orange',  label: 'Sunrise',  accent: '#FF9500' },
  { id: 'pink',    label: 'Blossom',  accent: '#FF2D55' },
  { id: 'teal',    label: 'Mint',     accent: '#5AC8FA' },
  { id: 'indigo',  label: 'Midnight', accent: '#5856D6' },
];

export default function ThemePickerModal({ visible, onClose }) {
  const { theme, changeTheme, accent, changeAccent } = useTheme();
  const isDark = theme === 'dark';
  const bg = isDark ? '#1c1c1e' : '#fff';
  const fg = isDark ? '#fff' : '#000';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: fg }]}>Appearance</Text>

          {/* Light / Dark toggle */}
          <Text style={[styles.sectionLabel, { color: isDark ? '#888' : '#555' }]}>MODE</Text>
          <View style={styles.modeRow}>
            {['light', 'dark'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, theme === m && { borderColor: accent, borderWidth: 2 }, { backgroundColor: isDark ? '#2c2c2e' : '#f0f0f5' }]}
                onPress={() => changeTheme(m)}
              >
                <Text style={{ fontSize: 22 }}>{m === 'light' ? '☀️' : '🌙'}</Text>
                <Text style={[styles.modeBtnLabel, { color: fg }]}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Accent colours */}
          <Text style={[styles.sectionLabel, { color: isDark ? '#888' : '#555' }]}>ACCENT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accentRow}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.accentDot, { backgroundColor: p.accent }, accent === p.accent && styles.accentDotSelected]}
                onPress={() => changeAccent(p.accent)}
              >
                {accent === p.accent ? <Text style={styles.checkmark}>✓</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={[styles.doneBtn, { backgroundColor: accent }]} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#555', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12, marginTop: 4 },
  modeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  modeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14,
    borderWidth: 1, borderColor: 'transparent',
  },
  modeBtnLabel: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  accentRow: { flexDirection: 'row', marginBottom: 28 },
  accentDot: {
    width: 44, height: 44, borderRadius: 22,
    marginRight: 12, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'transparent',
  },
  accentDotSelected: { borderColor: '#fff', transform: [{ scale: 1.1 }] },
  checkmark: { color: '#fff', fontWeight: '900', fontSize: 18 },
  doneBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
