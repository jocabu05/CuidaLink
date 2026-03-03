/**
 * theme.ts — Tokens de diseño del sistema CuidaLink.
 *
 * Exporta constantes globales de estilo:
 * - BRAND: paleta de colores corporativos (azul primario, acentos, semánticos)
 * - TYPOGRAPHY: tamaños y pesos de fuente
 * - SPACING: sistema de espaciado consistente (xs, sm, md, lg, xl)
 * - SHADOWS: sombras para cards y elevaciones
 * - BORDER_RADIUS: radios de borde estándar
 *
 * Se importa en TODOS los componentes y pantallas para mantener
 * consistencia visual en toda la app.
 */

// CuidaLink Theme - Colores y tipografía del sistema

// ─── PALETA UNIFICADA AZUL + BLANCO ───
export const BRAND = {
  primary:   '#1565C0',   // Azul corporativo — headers, botones principales
  secondary: '#1976D2',   // Azul medio — header bar, acentos
  accent:    '#2196F3',   // Azul claro — badges, links, iconos
  light:     '#E3F2FD',   // Azul muy claro — fondos de tarjeta, badges
  surface:   '#F8FAFE',   // Blanco azulado — fondo de pantalla
  text:      '#0D47A1',   // Azul oscuro — texto sobre fondo claro
};

// Alias legacy (se mantienen para compatibilidad)
export const CUIDADORA = {
  primary:   '#1565C0',
  secondary: '#1976D2',
  accent:    '#2196F3',
  light:     '#E3F2FD',
  surface:   '#F8FAFE',
  text:      '#0D47A1',
  header:    '#1976D2',
};
export const FAMILIAR = {
  primary:   '#1565C0',
  secondary: '#1976D2',
  accent:    '#2196F3',
  light:     '#E3F2FD',
  surface:   '#F8FAFE',
  text:      '#0D47A1',
  header:    '#1976D2',
};

// ─── COLORES DE TIPO DE EVENTO (unificados) ───
export const EVENT_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  LLEGADA:  { color: '#1565C0', bg: '#E3F2FD', label: 'Llegada' },
  PASTILLA: { color: '#0277BD', bg: '#E1F5FE', label: 'Medicamento' },
  COMIDA:   { color: '#E65100', bg: '#FFF3E0', label: 'Comida' },
  PASEO:    { color: '#7B1FA2', bg: '#F3E5F5', label: 'Paseo' },
  SIESTA:   { color: '#5C6BC0', bg: '#E8EAF6', label: 'Siesta' },
  CAIDA:    { color: '#C62828', bg: '#FFEBEE', label: 'Caída' },
  SALIDA:   { color: '#546E7A', bg: '#ECEFF1', label: 'Salida' },
  FUGA:     { color: '#C62828', bg: '#FFEBEE', label: 'Fuga' },
};

export const COLORS = {
  // Colores principales
  primary: BRAND.primary,
  primaryLight: BRAND.accent,
  primaryLighter: BRAND.light,
  warning: '#FF9800',
  danger: '#F44336',

  // Fondos
  background: BRAND.surface,
  backgroundDark: '#EAF0F7',
  white: '#FFFFFF',

  // Textos
  text: '#212121',
  textSecondary: '#757575',
  textLight: '#9E9E9E',
  textOnPrimary: '#FFFFFF',

  // Estados
  success: '#4CAF50',
  info: '#2196F3',

  // Bordes y sombras
  border: '#E0E0E0',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const TYPOGRAPHY = {
  // Fuentes
  fontFamily: 'System',
  fontFamilyBold: 'System',

  // Tamaños según especificación
  button: {
    fontSize: 24,
    fontWeight: 'bold' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 18,
    fontWeight: 'normal' as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: 'normal' as const,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BUTTON_HEIGHT = 80; // Altura de botones principales

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ─── ACCESSIBILITY ───

export const ACCESSIBLE_TYPOGRAPHY = {
  fontFamily: 'System',
  fontFamilyBold: 'System',
  button: { fontSize: 28, fontWeight: 'bold' as const },
  title: { fontSize: 34, fontWeight: 'bold' as const },
  subtitle: { fontSize: 26, fontWeight: '600' as const },
  body: { fontSize: 22, fontWeight: 'normal' as const },
  caption: { fontSize: 18, fontWeight: 'normal' as const },
};

export const HIGH_CONTRAST_COLORS = {
  ...COLORS,
  text: '#000000',
  textSecondary: '#333333',
  textLight: '#555555',
  background: '#FFFFFF',
  backgroundDark: '#E0E0E0',
  border: '#000000',
  primary: '#0D47A1',
  danger: '#B71C1C',
  warning: '#E65100',
};

// Accessibility preferences utility (uses AsyncStorage)
const ACCESSIBILITY_KEY = 'cuidalink_accessibility';

export interface AccessibilityPrefs {
  largeText: boolean;
  highContrast: boolean;
}

export const getAccessibilityPrefs = async (): Promise<AccessibilityPrefs> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const data = await AsyncStorage.getItem(ACCESSIBILITY_KEY);
    return data ? JSON.parse(data) : { largeText: false, highContrast: false };
  } catch {
    return { largeText: false, highContrast: false };
  }
};

export const setAccessibilityPrefs = async (prefs: AccessibilityPrefs): Promise<void> => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(prefs));
};

