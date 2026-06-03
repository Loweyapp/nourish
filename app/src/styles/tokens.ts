// Design tokens — Nourish design system
// All colour/spacing/type constants live here. Components import from here, never hardcode values.
// WCAG rules: palette colours are chrome-only (borders, icons, accents). Never applied to text.
// Primary text: #111111. Secondary text: #767676 (4.54:1 AA on white). Floor font size: 12px.

export const colours = {
  // Backgrounds
  pageBg: '#f5f5f5',
  cardBg: '#ffffff',
  inputBg: '#ffffff',
  subtleBg: '#f9f9f9',
  mutedBg: '#f5f5f5',

  // Text — WCAG-safe on white backgrounds
  textPrimary: '#111111',
  textSecondary: '#767676',
  textMuted: '#aaaaaa',

  // Brand / accent — chrome use only (borders, dots, icons, buttons). NOT text colour.
  green: '#9ebd6e',    // primary accent
  greenDark: '#7aA050',
  greenDeep: '#6a9e6a',

  // Feature accents
  blue: '#4a86d8',     // Fitbit
  purple: '#805d93',   // Mood
  orange: '#f59c38',   // Exercise
  pink: '#e8457a',     // Blood pressure / alerts
  teal: '#26b5a8',     // Energy trend line

  // Borders / dividers
  border: '#efefef',
  borderStrong: '#e0e0e0',

  // Status
  warning: '#f0c040',
  warningText: '#3d2800',
  success: '#edfaf2',
  successBorder: '#6a9e6a',
  error: '#fff5f7',
  errorBorder: '#e8457a',
} as const

export const fontSizes = {
  xs: 11,
  sm: 12,   // floor — nothing smaller
  base: 14,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
} as const

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const

export const shadows = {
  card: '0 1px 6px rgba(0,0,0,0.04)',
} as const
