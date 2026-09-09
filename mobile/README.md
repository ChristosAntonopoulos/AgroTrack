# Mobile — Olive Lifecycle (Expo)

Production APKs are built as **release** on the Azure CI agent (JS bundle embedded, no Metro). Served from the web frontend at `/downloads/Oleachron-alpha.apk`. **EAS is not used.**

## Run locally

**Do not use Expo Go** — MapLibre is a native module and is not included in Expo Go.

```powershell
cd mobile
npm install

# If Android Studio is installed (recommended on Windows):
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
npm run android    # first run: prebuild + Gradle dev client (~5–15 min)
npm start          # Metro for dev client (after native build is installed)
```

`npm run android` runs [`scripts/run-android.cjs`](mobile/scripts/run-android.cjs), which auto-detects JDK 17+ (Android Studio JBR, `JAVA_HOME`, etc.). Use `npm run android:direct` if `JAVA_HOME` is already set.

Optional Windows helper (dot-source in PowerShell): `. .\scripts\setup-java.ps1`

**Maps:** Field maps use [MapLibre Native](https://maplibre.org/maplibre-react-native/) with free Esri satellite and OpenStreetMap street tiles — no Google Maps API key.

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
| `scripts/build-android-apk.sh` | Gradle release APK → `mobile/Oleachron-mobile.apk` |
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
