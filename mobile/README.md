# Mobile — Olive Lifecycle (Expo)

Production APKs are built as **release** on the agent (JS bundle embedded). Debug builds expect Metro and will show "Unable to load script" when installed standalone.

## Run locally (Expo Go)

```bash
npm install
npx expo start
```

## Build APK locally (same as CI)

```bash
npm install
chmod +x scripts/*.sh
BACKEND_API_URL=http://185.193.66.50:31847 BUILD_BUILDID=1 ./scripts/build-android-apk.sh
node scripts/stage-apk-for-frontend.js
```

APK lands in `../frontend/public/downloads/`.

## Environment

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API (set in CI / `eas.json` production profile) |
| `EXPO_PUBLIC_SHOW_DEMO_LOGIN` | Quick-login chips on sign-in |
| `EXPO_PUBLIC_USE_MOCK_DATA` | Offline mock mode |

See `.env.example`.

## Versioning

- `app.json` → `expo.version` — user-visible version (bump manually)
- `expo.android.versionCode` — set in CI from `Build.BuildId` (auto)

EAS (`eas build`) is optional and not used by the main pipeline.
