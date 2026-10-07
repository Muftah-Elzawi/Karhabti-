import { palette, radius, space, typeScale } from '@karhabti/config/tamagui/tokens';

export { palette, radius, space, typeScale };

/**
 * Font family names as registered with expo-font in the root layout.
 * (The CSS font stacks in the shared tokens don't apply on native.)
 */
export const fonts = {
  arabic: 'IBMPlexSansArabic_400Regular',
  arabicMedium: 'IBMPlexSansArabic_500Medium',
  latin: 'Inter_400Regular',
  latinMedium: 'Inter_500Medium',
} as const;

/** Semantic colors, mirroring the web app's usage of the brand palette. */
export const colors = {
  background: palette.warmBeige,
  surface: palette.white,
  text: palette.charcoal,
  textSecondary: palette.slate,
  primary: palette.aubergine,
  onPrimary: palette.white,
  accent: palette.copper,
  success: palette.success,
} as const;
