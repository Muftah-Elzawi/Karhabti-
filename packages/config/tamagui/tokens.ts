/**
 * Karhabti design tokens (KARHABTI_BUILD_PROMPT.md §4).
 *
 * Framework-free token definitions. The Tamagui `createTamagui` wiring that
 * consumes these lands with the web skeleton (Phase 1, Step 6).
 */

export const palette = {
  /** Libyan red — primary actions, brand */
  libyanRed: '#C8102E',
  /** Charcoal — text, dark surfaces */
  charcoal: '#1A1A1A',
  /** Sand amber — accents, highlights, indicators */
  sandAmber: '#E8A33D',
  /** Warm white — backgrounds (never pure white) */
  warmWhite: '#FAF7F2',
  /** Olive green — success states, "in stock"/"available" badges */
  oliveGreen: '#5C7A2A',
} as const;

export const fontFamilies = {
  /** Arabic UI face (default locale) */
  arabic: "'IBM Plex Sans Arabic', sans-serif",
  /** Latin UI face */
  latin: "'Inter', sans-serif",
} as const;

/** Two weights only: regular + medium (sentence case everywhere). */
export const fontWeights = {
  regular: 400,
  medium: 500,
} as const;

/** Type scale in px (mobile-first). */
export const typeScale = {
  caption: 12,
  body: 14,
  bodyLarge: 16,
  title: 20,
  headline: 24,
  display: 32,
} as const;

/** Spacing scale in px (4pt grid). */
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

export type Palette = typeof palette;
export type TypeScale = typeof typeScale;
