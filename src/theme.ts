export const colors = {
  light: {
    background: '#f1f5f9',
    card: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    primary: '#2563eb',
    primaryLight: '#eff6ff',
    accent: '#f59e0b',
    accentLight: '#fffbeb',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    dangerLight: '#fef2f2',
    navBg: '#ffffff',
  },
  dark: {
    background: '#0d1b2a',
    card: '#1b263b',
    surface: '#132238',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    border: '#273852',
    primary: '#3b82f6',
    primaryLight: 'rgba(59, 130, 246, 0.15)',
    accent: '#f59e0b',
    accentLight: 'rgba(245, 158, 11, 0.12)',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    dangerLight: 'rgba(239, 68, 68, 0.15)',
    navBg: '#070f18',
  },
};

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extraBold: 'Poppins_800ExtraBold',
};

export type AppTheme = typeof colors.light;
