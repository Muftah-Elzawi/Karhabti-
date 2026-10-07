# @karhabti/mobile

Karhabti customer mobile app — React Native + Expo (SDK 57), expo-router, Arabic-first RTL.
Standalone-runnable like every app in the monorepo; talks to the API over HTTP only.

## Run it on your phone (dev)

1. Install **Expo Go** from the Play Store (Android) or App Store (iOS).
2. Start the API on your PC: `pnpm --filter @karhabti/api dev`
3. Point the app at your PC's LAN IP (phone and PC on the same Wi-Fi):

   ```powershell
   copy .env.example .env   # then edit: EXPO_PUBLIC_API_URL=http://<your-ipv4>:3001
   ipconfig                 # find the IPv4 address
   ```

4. Start Metro and scan the QR code with Expo Go:

   ```powershell
   pnpm --filter @karhabti/mobile dev
   ```

On first launch the app flips the native layout direction to RTL and reloads
itself once — that flash is expected (dev only; release builds boot RTL via
`app.json` → `extra.forcesRTL`).

## Structure

| Path              | What it is                                                        |
| ----------------- | ----------------------------------------------------------------- |
| `src/app/`        | expo-router screens (`_layout` = fonts + locale provider + stack) |
| `src/components/` | Shared UI (buttons, …)                                            |
| `src/lib/`        | i18n provider, storage abstraction (SecureStore), API config      |
| `src/theme.ts`    | Brand tokens from `@karhabti/config` mapped for React Native      |

## Status

Step M1 (scaffold + RTL shell) — welcome + placeholder login screen, ar/en
switch, brand fonts/colors. Auth (M2), booking (M3), and payments (M4) follow.
