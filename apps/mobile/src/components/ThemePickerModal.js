import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme, THEMES } from '../context/ThemeContext';

export default function ThemePickerModal({ visible, onClose }) {
  const { theme, colors, setTheme } = useAppTheme();

  const options = [
    { key: THEMES.system, label: 'System Default' },
    { key: THEMES.dark, label: 'Dark Mode (OLED)' },
    { key: THEMES.light, label: 'Light Mode' },
    { key: THEMES.midnight, label: 'Midnight Indigo' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Appearance</Text>

          {options.map((opt) => {
            const isSelected = theme === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: isSelected ? colors.surface : 'transparent',
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setTheme(opt.key);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: isSelected ? colors.primary : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {isSelected ? <Text style={{ color: colors.primary, fontSize: 16 }}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
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
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 15,
  },
});
