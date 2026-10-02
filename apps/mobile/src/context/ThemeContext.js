import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState(systemTheme || 'light');
  const [accent, setAccent] = useState('#0a7ea4');

  useEffect(() => {
    // Load persisted theme
    AsyncStorage.getItem('theme').then((t) => { if (t) setTheme(t) });
    AsyncStorage.getItem('accent').then((a) => { if (a) setAccent(a) });
  }, []);

  const changeTheme = async (newTheme) => {
    setTheme(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };

  const changeAccent = async (newAccent) => {
    setAccent(newAccent);
    await AsyncStorage.setItem('accent', newAccent);
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, accent, changeAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
