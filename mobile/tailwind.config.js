/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        // DM Sans static weights — font-sans-* classes set the family directly
        // because Android does not synthesise weights for custom fonts.
        sans: ['DMSans_400Regular'],
        'sans-medium': ['DMSans_500Medium'],
        'sans-semibold': ['DMSans_600SemiBold'],
        'sans-bold': ['DMSans_700Bold'],
        // Eina 01 — website display face (padosipro.com headings)
        display: ['Eina01-Bold'],
        'display-regular': ['Eina01-Regular'],
      },
      colors: {
        // Warm ivory surfaces — concierge warmth over sterile white
        ivory: '#FAF6EF',
        sand: {
          DEFAULT: '#E9E1D3',
          dark: '#D8CDB8',
        },
        // Brand green — padosipro.com theme colour rgb(66, 178, 103)
        pine: {
          50: '#F0FAF4',
          100: '#DCF3E5',
          200: '#B9E7CC',
          300: '#86D5A8',
          400: '#5CC584',
          500: '#42B267',
          600: '#36A059',
          700: '#2C8149',
          800: '#24683C',
          900: '#1A4D2C',
        },
        // Saffron accent — Indian warmth, used sparingly
        saffron: {
          DEFAULT: '#E8A33D',
          dark: '#C9861F',
          soft: '#FBEED3',
        },
        ink: {
          DEFAULT: '#26221C',
          soft: '#575046',
          muted: '#8A8175',
        },
        danger: '#B3261E',
        success: '#1E7B45',
      },
    },
  },
  plugins: [],
};
