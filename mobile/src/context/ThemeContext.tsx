import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── PALETA UNIFICADA AZUL ───
const BRAND = {
  primary: '#1565C0',
  header: '#1565C0',
  accent: '#2196F3',
  light: '#E3F2FD',
  surface: '#F8FAFE',
  text: '#0D47A1',
};

// ─── LIGHT PALETTE ───
const LIGHT = {
  // Role-specific (unified blue)
  rolePrimary: BRAND.primary,
  roleHeader: BRAND.header,
  roleAccent: BRAND.accent,
  roleLight: BRAND.light,
  roleSurface: BRAND.surface,
  roleText: BRAND.text,

  primary: '#1565C0',
  primaryLight: '#2196F3',
  warning: '#FF9800',
  danger: '#F44336',
  success: '#4CAF50',
  info: '#2196F3',

  background: '#F8FAFE',
  backgroundDark: '#EAF0F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',

  text: '#212121',
  textSecondary: '#757575',
  textLight: '#9E9E9E',
  textOnPrimary: '#FFFFFF',

  border: '#E0E0E0',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',

  tabBar: '#FFFFFF',
  tabBarInactive: '#B0BEC5',
  statusBar: 'dark' as 'dark' | 'light',

  // Specific UI colors
  headerBg: '#1565C0',
  inputBg: '#F5F5F5',
  pillBg: '#E3F2FD',
  pillText: '#1565C0',
  dangerBg: '#FFEBEE',
  dangerText: '#C62828',
  infoBg: '#E3F2FD',
  infoText: '#1565C0',
  warningBg: '#FFF3E0',
  warningText: '#E65100',
};

// ─── DARK PALETTE ───
const DARK: typeof LIGHT = {
  rolePrimary: '#42A5F5',
  roleHeader: '#0D47A1',
  roleAccent: '#64B5F6',
  roleLight: '#1A2B3E',
  roleSurface: '#172230',
  roleText: '#90CAF9',

  primary: '#42A5F5',
  primaryLight: '#64B5F6',
  warning: '#FFB74D',
  danger: '#EF5350',
  success: '#4CAF50',
  info: '#42A5F5',

  background: '#121212',
  backgroundDark: '#0A0A0A',
  surface: '#1E1E1E',
  surfaceElevated: '#2C2C2C',
  card: '#1E1E1E',

  text: '#E0E0E0',
  textSecondary: '#9E9E9E',
  textLight: '#757575',
  textOnPrimary: '#000000',

  border: '#333333',
  shadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.7)',

  tabBar: '#1E1E1E',
  tabBarInactive: '#616161',
  statusBar: 'light' as 'dark' | 'light',

  // Specific UI colors
  headerBg: '#0D47A1',
  inputBg: '#2C2C2C',
  pillBg: '#1A2B3E',
  pillText: '#64B5F6',
  dangerBg: '#3E1A1A',
  dangerText: '#EF9A9A',
  infoBg: '#1A2B3E',
  infoText: '#90CAF9',
  warningBg: '#3E2A1A',
  warningText: '#FFB74D',
};

export type AppTheme = typeof LIGHT;
type Role = 'cuidadora' | 'familiar';

interface ThemeContextType {
  isDark: boolean;
  toggleDarkMode: () => void;
  colors: AppTheme;
  role: Role;
  setRole: (r: Role) => void;
}

const THEME_KEY = 'cuidalink_dark_mode';

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleDarkMode: () => {},
  colors: LIGHT,
  role: 'cuidadora',
  setRole: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [role, setRole] = useState<Role>('cuidadora');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val === 'true') setIsDark(true);
    });
  }, []);

  const toggleDarkMode = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, String(next));
      return next;
    });
  };

  const colors = useMemo(() => (isDark ? { ...DARK } : { ...LIGHT }), [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleDarkMode, colors, role, setRole }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
