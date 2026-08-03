import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { useI18n } from '@/lib/i18n';
import { colors, space, typeScale } from '@/theme';

/** Placeholder — the real auth flow (login / register / OTP) lands in Step M2. */
export default function LoginScreen() {
  const { messages: m, font } = useI18n();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={[styles.title, { fontFamily: font('medium') }]}>{m.auth.loginTitle}</Text>
        <Text style={[styles.body, { fontFamily: font() }]}>{m.common.comingSoon}</Text>
      </View>
      <AppButton label={m.common.back} variant="secondary" onPress={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    padding: space.lg,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    gap: space.md,
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: typeScale.headline,
  },
  body: {
    color: colors.textSecondary,
    fontSize: typeScale.body,
    textAlign: 'center',
  },
});
