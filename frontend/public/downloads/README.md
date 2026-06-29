# OliveCycle Alpha APK (served by frontend nginx)

## Public download (latest)

- **URL:** `/downloads/olivecycle-alpha.apk`
- **Manifest:** `/downloads/latest.json` (version, build id, timestamp)

## How CI builds it (no EAS)

One atomic pipeline step runs `mobile/scripts/build-and-stage-apk.sh`:

1. JDK + Android SDK on the agent (`setup-java.sh`, `setup-android-sdk.sh`)
2. `build-android-apk.sh` — `expo prebuild` + Gradle `assembleRelease` (JS bundle embedded)
3. `stage-apk-for-frontend.js` — copies into `frontend/public/downloads/`
4. Frontend Docker image is rebuilt and deployed

**Important:** Do not re-run only the staging half in Azure DevOps. Always re-run the full **Build and stage APK** step.

## Queue a new mobile version

1. Bump `"version"` in `mobile/app.json` when you want a new user-visible release (e.g. `1.0.1`)
2. `versionCode` is set automatically from the pipeline `Build.BuildId`
3. Push to `main` and enable **Build Android APK on agent** when queueing the pipeline
4. Install from the landing page or `/downloads/olivecycle-alpha.apk`

Archived copy per build: `/downloads/olivecycle-{version}-b{versionCode}.apk`

## Local build (developer machine)

```bash
cd mobile
npm install
chmod +x scripts/*.sh
BACKEND_API_URL=http://185.193.66.50:31847 BUILD_BUILDID=999 BUILD_ID=999 ./scripts/build-and-stage-apk.sh
```
