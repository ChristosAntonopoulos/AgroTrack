# OliveCycle Alpha APK (served by frontend nginx)

## Public download (latest)

- **URL:** `/downloads/olivecycle-alpha.apk`
- **Manifest:** `/downloads/latest.json` (version, build id, timestamp)

## How CI builds it (no EAS)

1. Azure pipeline **MobileBuild** stage runs on the agent:
   - `expo prebuild` + Gradle `assembleRelease` (JS bundle embedded — works without Metro)
2. `mobile/scripts/stage-apk-for-frontend.js` copies APK into `frontend/public/downloads/`
3. Frontend Docker image is rebuilt and deployed

## Queue a new mobile version

1. Bump `"version"` in `mobile/app.json` when you want a new user-visible release (e.g. `1.0.1`)
2. `versionCode` is set automatically from the pipeline `Build.BuildId`
3. Push to `main` with **Build Android APK on agent** enabled (default: on)
4. Install from the landing page or `/downloads/olivecycle-alpha.apk`

Archived copy per build: `/downloads/olivecycle-{version}-b{versionCode}.apk`

## Local build (developer machine)

```bash
cd mobile
npm install
chmod +x scripts/*.sh
BACKEND_API_URL=http://185.193.66.50:31847 BUILD_BUILDID=999 ./scripts/build-android-apk.sh
node scripts/stage-apk-for-frontend.js
```
