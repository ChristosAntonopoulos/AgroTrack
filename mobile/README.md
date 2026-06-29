# Mobile — Olive Lifecycle (Expo)

Production APKs are built as **release** on the Azure CI agent (JS bundle embedded, no Metro). Served from the web frontend at `/downloads/olivecycle-alpha.apk`. **EAS is not used.**

## Run locally (Expo Go)

```bash
npm install
npx expo start
```

## Build + stage APK locally (same as CI)

```bash
npm install
chmod +x scripts/*.sh
BACKEND_API_URL=http://185.193.66.50:31847 BUILD_BUILDID=1 BUILD_ID=1 ./scripts/build-and-stage-apk.sh
```

APK lands in `../frontend/public/downloads/`.

## CI scripts

| Script | Role |
|--------|------|
| `scripts/build-and-stage-apk.sh` | **Atomic** build + stage (use this in pipeline) |
| `scripts/build-android-apk.sh` | Gradle release APK → `mobile/agrotrack-mobile.apk` |
| `scripts/stage-apk-for-frontend.js` | Copy to `frontend/public/downloads/` + `latest.json` |

Do not run staging alone in Azure DevOps without the build step.

## Environment

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API |
| `EXPO_PUBLIC_SHOW_DEMO_LOGIN` | Quick-login chips on sign-in |
| `EXPO_PUBLIC_USE_MOCK_DATA` | Offline mock mode |

See `.env.example`.

## Versioning

- `app.json` → `expo.version` — user-visible version (bump manually)
- `expo.android.versionCode` — set in CI from `Build.BuildId` (auto)
