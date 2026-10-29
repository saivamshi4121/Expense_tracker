import '@/global.css';

import { Platform } from 'react-native';

// ─── Colors ──────────────────────────────────────────────────────────────────

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ─── App Design Tokens ──────────────────────────────────────────────────────

/** Core app palette — dark theme only */
export const AppColors = {
  bg: '#0F0F14',
  surface: '#1A1A24',
  surface2: '#22222E',
  inputBg: '#2A2A3A',
  border: '#2A2A3A',
  borderLight: '#3A3A4A',

  accent: '#6C63FF',
  accentLight: 'rgba(108, 99, 255, 0.12)',

  textPrimary: '#F5F5F7',
  textSecondary: '#8A8A9A',
  textMuted: '#5A5A6A',

  success: '#22C55E',
  successLight: 'rgba(34, 197, 94, 0.12)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.12)',

  info: '#3B82F6',
  infoLight: 'rgba(59, 130, 246, 0.12)',

  white: '#FFFFFF',
  whiteAlpha60: 'rgba(255, 255, 255, 0.6)',
  whiteAlpha40: 'rgba(255, 255, 255, 0.4)',
} as const;

/** Typography scale */
export const AppTypography = {
  heroAmount: {
    fontSize: 40,
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  small: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  chip: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  button: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
} as const;

/** Spacing scale */
export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

/** Border radius scale */
export const AppRadius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  pill: 999,
} as const;

/** Touch target minimum size */
export const MIN_TOUCH_TARGET = 48;

// ─── Fonts ──────────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// ─── Spacing (legacy — kept for backward compat) ────────────────────────────

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
