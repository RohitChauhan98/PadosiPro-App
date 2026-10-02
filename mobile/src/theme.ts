// Brand palette — mirrors tailwind.config.js for places className can't reach
// (navigation chrome, ActivityIndicator, placeholderTextColor, status bar).
export const colors = {
  ivory: '#FAF6EF',
  sand: '#E9E1D3',
  sandDark: '#D8CDB8',
  pine: '#42B267',
  pineDark: '#2C8149',
  pineDarker: '#1A4D2C',
  saffron: '#E8A33D',
  saffronDark: '#C9861F',
  saffronSoft: '#FBEED3',
  ink: '#26221C',
  inkSoft: '#575046',
  inkMuted: '#8A8175',
  danger: '#B3261E',
  success: '#1E7B45',
  white: '#FFFFFF',
} as const;

// Font family names registered in the root layout — for the few places
// className cannot reach (toast text, sheets).
export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  display: 'Eina01-Bold',
  displayRegular: 'Eina01-Regular',
} as const;
