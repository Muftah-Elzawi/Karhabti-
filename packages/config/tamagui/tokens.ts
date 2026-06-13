/**
 * Karhabti design tokens — "Diagnose Drive" identity (see brand/README.md).
 *
 * Framework-free token definitions. The Tamagui `createTamagui` wiring that
 * consumes these lands with packages/ui shared components (Phase 2).
 */

export const palette = {
  /** Aubergine — primary brand, primary actions, dark surfaces */
  aubergine: '#3B1E4A',
  /** Copper bronze — accents, the needle, highlights */
  copper: '#B86F3D',
  /** Slate gray — secondary text, structure */
  slate: '#485563',
  /** Warm beige — backgrounds (never pure white) */
  warmBeige: '#F2E8DB',
  /** Deep charcoal — body text on light surfaces */
  charcoal: '#1E1E1E',
  /** White — text/art on dark surfaces */
  white: '#FFFFFF',
  /** Functional green — success states, "in stock"/"available" (not a brand color) */
  success: '#5C7A2A',
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
