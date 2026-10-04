const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mobileDir = path.join(__dirname, '..');

function findAndroidSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
      : path.join(process.env.HOME || '', 'Android', 'Sdk'),
  ].filter(Boolean);

  for (const sdk of candidates) {
    if (fs.existsSync(path.join(sdk, 'platform-tools'))) {
      return sdk;
    }
  }
  return null;
}

function ensureLocalProperties(androidSdk) {
  const androidDir = path.join(mobileDir, 'android');
  if (!fs.existsSync(androidDir)) return;

  const localPropsPath = path.join(androidDir, 'local.properties');
  const sdkDirLine = `sdk.dir=${androidSdk.replace(/\\/g, '\\\\')}`;
  const existing = fs.existsSync(localPropsPath)
    ? fs.readFileSync(localPropsPath, 'utf8')
    : '';

  if (!existing.includes('sdk.dir=')) {
    fs.writeFileSync(
      localPropsPath,
      `${existing.trim()}\n${sdkDirLine}\n`.trimStart()
    );
  }
}

function getJavaVersion(javaPath) {
  const result = spawnSync(javaPath, ['-version'], { encoding: 'utf8' });
  const text = `${result.stderr || ''}${result.stdout || ''}`;
  const match = text.match(/version "(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function tryJdk(jdkPath) {
  if (!jdkPath) return null;
  const javaPath = path.join(
    jdkPath,
    'bin',
    process.platform === 'win32' ? 'java.exe' : 'java'
  );
  if (!fs.existsSync(javaPath)) return null;
  const version = getJavaVersion(javaPath);
  return version >= 17 ? jdkPath : null;
}

function globJdkDirs(patternBase) {
  if (!fs.existsSync(patternBase)) {
    const parent = path.dirname(patternBase);
    const prefix = path.basename(patternBase).replace('*', '');
    if (!fs.existsSync(parent)) return [];
    return fs
      .readdirSync(parent)
      .filter((name) => name.startsWith(prefix))
      .map((name) => path.join(parent, name));
  }
  return [patternBase];
}

function findJdk() {
  const candidates = [
    process.env.JAVA_HOME,
    process.env.JAVA_HOME_17_X64,
    process.platform === 'win32' ? 'C:\\Program Files\\Android\\Android Studio\\jbr' : null,
  ];

  if (process.platform === 'win32') {
    candidates.push(
      ...globJdkDirs('C:\\Program Files\\Eclipse Adoptium\\jdk-17'),
      ...globJdkDirs('C:\\Program Files\\Microsoft\\jdk-17'),
      ...globJdkDirs('C:\\Program Files\\Java\\jdk-17')
    );
  }

  for (const candidate of candidates) {
    const jdk = tryJdk(candidate);
    if (jdk) return jdk;
  }

  throw new Error(
    'JDK 17+ required for Android builds.\n' +
      (process.platform === 'win32'
        ? "Set JAVA_HOME, e.g. $env:JAVA_HOME = 'C:\\Program Files\\Android\\Android Studio\\jbr'"
        : 'Install JDK 17+ and set JAVA_HOME.')
  );
}

const javaHome = findJdk();
console.log(`JAVA_HOME=${javaHome}`);

const androidSdk = findAndroidSdk();
if (!androidSdk) {
  throw new Error(
    'Android SDK not found. Install Android Studio or set ANDROID_HOME to your SDK path.'
  );
}
console.log(`ANDROID_HOME=${androidSdk}`);
ensureLocalProperties(androidSdk);

function adbBin() {
  const name = process.platform === 'win32' ? 'adb.exe' : 'adb';
  return path.join(androidSdk, 'platform-tools', name);
}

function adbReverse() {
  const adb = adbBin();
  if (!fs.existsSync(adb)) return;
  const devices = spawnSync(adb, ['devices'], { encoding: 'utf8' });
  if (!devices.stdout || !/emulator-|device$/.test(devices.stdout)) {
    console.log('adb: no device yet — Expo will retry after the emulator boots.');
    return;
  }
  for (const port of ['8081', '8082', '8097', '5149']) {
    spawnSync(adb, ['reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'inherit' });
  }
}

adbReverse();

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npx, ['expo', 'run:android', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    ANDROID_HOME: androidSdk,
    ANDROID_SDK_ROOT: androidSdk,
    // Emulator cannot reach the LAN IP; bundle over adb reverse + loopback.
    REACT_NATIVE_PACKAGER_HOSTNAME: process.env.REACT_NATIVE_PACKAGER_HOSTNAME || '127.0.0.1',
  },
  cwd: mobileDir,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
