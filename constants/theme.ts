/**
 * 片付けカード - Design System
 *
 * Aesthetic: "Soft Kinetic Paper"
 * - Inspired by Japanese washi paper texture
 * - Warm, calming colors that reduce anxiety
 * - Physical card metaphor with tactile feedback
 * - Gentle, non-rushing animations
 */

import { Platform } from 'react-native';

const SHARED_GRADIENTS = {
  atmosphere: ['rgba(118, 135, 255, 0.35)', 'rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0)'],
  surface: ['#F7F9FF', '#EDE9FF', '#E5F4F7'],
  badge: ['rgba(166, 197, 255, 0.9)', 'rgba(255, 255, 255, 0.95)'],
  button: ['#FFAB96', '#FFC6E1', '#E5D9FF'],
};

// Color Palette - Warm, calming earth tones
export const Colors = {
  // Primary cream background - like aged paper
  cream: '#FAF6F1',
  creamDark: '#F5EFE7',

  // Soft shadows and borders
  shadow: 'rgba(139, 119, 101, 0.12)',
  shadowDark: 'rgba(139, 119, 101, 0.25)',

  // Text colors - soft charcoal, never pure black
  text: {
    primary: '#3D3632',
    secondary: '#7A6F66',
    tertiary: '#A89F96',
    inverse: '#FAF6F1',
  },

  // Accent - soft coral/peach for completion & celebration
  accent: {
    coral: '#E8A598',
    coralLight: '#F2C4BA',
    coralDark: '#D68B7B',
    mint: '#A8C5B8',
    mintLight: '#C5DDD2',
  },

  // Card colors
  card: {
    background: '#F7F9FF',
    border: 'rgba(122, 111, 143, 0.2)',
    gradient: SHARED_GRADIENTS.surface,
    glow: 'rgba(255, 255, 255, 0.45)',
    innerStroke: 'rgba(255, 255, 255, 0.95)',
  },

  atmosphere: {
    halo: 'rgba(255, 255, 255, 0.8)',
    vignette: 'rgba(10, 18, 34, 0.35)',
    lens: 'rgba(114, 132, 255, 0.1)',
  },

  // Confetti colors - soft, paper-like
  confetti: [
    '#E8A598', // coral
    '#F2C4BA', // light coral
    '#A8C5B8', // mint
    '#C5DDD2', // light mint
    '#DDD5C8', // warm gray
    '#F5E6D3', // cream
    '#C9B8A8', // taupe
    '#E6D5C3', // sand
  ],

  // Overlay
  overlay: 'rgba(61, 54, 50, 0.4)',
  overlayLight: 'rgba(61, 54, 50, 0.6)',
};

export const Gradients = SHARED_GRADIENTS;

// Typography - Using system fonts with specific weights for Japanese support
export const Typography = {
  displayFont: Platform.select({
    ios: 'Hiragino Mincho ProN',
    android: 'serif',
    default: 'serif',
  }),
  bodyFont: Platform.select({
    ios: 'Hiragino Sans',
    android: 'sans-serif',
    default: 'System',
  }),
  fontFamily: Platform.select({
    ios: {
      regular: 'Hiragino Sans',
      medium: 'Hiragino Sans',
      bold: 'Hiragino Sans',
    },
    android: {
      regular: 'sans-serif',
      medium: 'sans-serif-medium',
      bold: 'sans-serif',
    },
    default: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
  }),

  // Font sizes with optical adjustments
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
};

// Spacing scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

// Border radius
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// Animation timings - gentle, never rushed
export const Animation = {
  // Durations
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    gentle: 800,
    relaxed: 1200,
  },

  // Spring configs for react-native-reanimated
  spring: {
    // Gentle bounce for cards
    gentle: {
      damping: 20,
      stiffness: 90,
      mass: 1,
    },
    // Snappy for quick feedback
    snappy: {
      damping: 15,
      stiffness: 150,
      mass: 0.8,
    },
    // Soft for floating elements
    soft: {
      damping: 25,
      stiffness: 60,
      mass: 1.2,
    },
    // Bouncy for celebration
    bouncy: {
      damping: 12,
      stiffness: 100,
      mass: 0.9,
    },
  },
};

// Shadow presets
export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 12,
  },
};

// Legacy theme colors for compatibility with existing hooks
export const LegacyColors = {
  light: {
    text: Colors.text.primary,
    background: Colors.cream,
    tint: Colors.accent.coral,
    icon: Colors.text.secondary,
    tabIconDefault: Colors.text.tertiary,
    tabIconSelected: Colors.accent.coral,
  },
  dark: {
    text: Colors.text.inverse,
    background: '#1A1A1A',
    tint: Colors.accent.coral,
    icon: Colors.text.tertiary,
    tabIconDefault: Colors.text.tertiary,
    tabIconSelected: Colors.accent.coral,
  },
};

// Legacy exports for compatibility
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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
