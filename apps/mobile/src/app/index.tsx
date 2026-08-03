import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { localeLabels, locales } from '@karhabti/i18n';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { useI18n } from '@/lib/i18n';
import { colors, fonts, space, typeScale } from '@/theme';

export default function WelcomeScreen() {
  const { messages: m, locale, setLocale, font } = useI18n();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.hero}>
        {/* The wordmark is always the Arabic brand name, in both locales. */}
        <Text style={styles.wordmark}>{m.common.appName}</Text>
        <Text style={[styles.tagline, { fontFamily: font() }]}>{m.common.tagline}</Text>
      </View>

      <View style={styles.actions}>
        <AppButton label={m.auth.loginTitle} onPress={() => router.push('/login')} />
        <AppButton
          label={m.auth.registerTitle}
          variant="secondary"
          onPress={() => router.push('/login')}
        />

        <View style={styles.localeRow}>
          {locales.map((l) => (
            <Pressable key={l} accessibilityRole="button" onPress={() => setLocale(l)}>
              <Text
                style={[
                  styles.localeLabel,
                  { fontFamily: l === 'ar' ? fonts.arabic : fonts.latin },
                  l === locale && styles.localeActive,
                ]}
              >
                {localeLabels[l]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    padding: space.lg,
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    gap: space.md,
    justifyContent: 'center',
  },
  wordmark: {
    color: colors.primary,
    fontFamily: fonts.arabicMedium,
    fontSize: typeScale.display + 16,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: typeScale.bodyLarge,
    textAlign: 'center',
  },
  actions: {
    gap: space.sm,
    paddingBottom: space.xl,
  },
  localeRow: {
    flexDirection: 'row',
    gap: space.lg,
    justifyContent: 'center',
    paddingTop: space.lg,
  },
  localeLabel: {
    color: colors.textSecondary,
    fontSize: typeScale.body,
  },
  localeActive: {
    color: colors.accent,
  },
});
