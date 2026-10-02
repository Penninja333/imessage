import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const THEMES = {
  system: 'system',
  dark: 'dark',
  light: 'light',
  midnight: 'midnight',
};

export const THEME_COLORS = {
  dark: {
    bg: '#000000',
    card: '#1C1C1E',
    surface: '#2C2C2E',
    border: '#38383A',
    text: '#FFFFFF',
    textMuted: '#8E8E93',
    primary: '#007AFF',
    bubbleSent: '#007AFF',
    bubbleReceived: '#26252A',
    bubbleSentText: '#FFFFFF',
    bubbleReceivedText: '#FFFFFF',
    inputBg: '#1C1C1E',
    danger: '#FF453A',
  },
  light: {
    bg: '#FFFFFF',
    card: '#F2F2F7',
    surface: '#E5E5EA',
    border: '#D1D1D6',
    text: '#000000',
    textMuted: '#8E8E93',
    primary: '#007AFF',
    bubbleSent: '#007AFF',
    bubbleReceived: '#E9E9EB',
    bubbleSentText: '#FFFFFF',
    bubbleReceivedText: '#000000',
    inputBg: '#F2F2F7',
    danger: '#FF3B30',
  },
  midnight: {
    bg: '#0B0F19',
    card: '#111827',
    surface: '#1F2937',
    border: '#374151',
    text: '#F9FAFB',
    textMuted: '#9CA3AF',
    primary: '#6366F1',
    bubbleSent: '#6366F1',
    bubbleReceived: '#1F2937',
    bubbleSentText: '#FFFFFF',
    bubbleReceivedText: '#F9FAFB',
    inputBg: '#111827',
    danger: '#EF4444',
  },
};

const ThemeContext = createContext({
  theme: 'system',
  colors: THEME_COLORS.dark,
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState('system');

  useEffect(() => {
    SecureStore.getItemAsync('app_theme').then((saved) => {
      if (saved && THEMES[saved]) {
        setThemeState(saved);
      }
    });
  }, []);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    SecureStore.setItemAsync('app_theme', newTheme);
  };

  const activeThemeKey = theme === 'system' ? systemColorScheme || 'dark' : theme;
  const colors = THEME_COLORS[activeThemeKey] || THEME_COLORS.dark;

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
