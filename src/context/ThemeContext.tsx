import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, AppTheme } from '../theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  themeMode: ThemeMode;
  isDark: boolean;
  theme: AppTheme;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const STORAGE_KEY_THEME = '@app_theme_mode';

const ThemeContext = createContext<ThemeContextProps>({
  themeMode: 'system',
  isDark: false,
  theme: colors.light,
  setThemeMode: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY_THEME);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
        }
      } catch (e) {
        console.warn('Error al cargar preferencia de tema:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_THEME, mode);
    } catch (e) {
      console.warn('Error al guardar preferencia de tema:', e);
    }
  };

  const isDark =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
      : themeMode === 'dark';

  const theme = isDark ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, theme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
