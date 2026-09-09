#!/usr/bin/env node
/**
 * Copy built APK into frontend/public/downloads for nginx serving.
 * Writes latest.json manifest (and optional versioned archive copy).
 */
const fs = require('fs');
const path = require('path');

function findNewestApk(searchRoot) {
  if (!fs.existsSync(searchRoot)) {
    return null;
  }

  const matches = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.apk')) {
        matches.push(full);
      }
    }
  };
  walk(searchRoot);

  if (matches.length === 0) {
    return null;
  }

  matches.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0];
}

function listDirSummary(dir) {
  if (!fs.existsSync(dir)) {
    return `(missing: ${dir})`;
  }
  try {
    return fs
      .readdirSync(dir)
      .map((name) => {
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        return stat.isDirectory() ? `${name}/` : `${name} (${stat.size} bytes)`;
      })
      .join('\n  ');
  } catch (error) {
    return `(cannot read ${dir}: ${error.message})`;
  }
}

const repoRoot = process.env.BUILD_SOURCESDIRECTORY
  ? path.resolve(process.env.BUILD_SOURCESDIRECTORY)
  : path.resolve(__dirname, '../..');
const mobileDir = path.join(repoRoot, 'mobile');
const downloadsDir = path.join(repoRoot, 'frontend', 'public', 'downloads');
const defaultApk = path.join(mobileDir, 'oleachron-mobile.apk');
const gradleApkRoot = path.join(mobileDir, 'android', 'app', 'build', 'outputs', 'apk');
const gradleApkCandidates = [
  path.join(gradleApkRoot, 'release', 'app-release.apk'),
  path.join(gradleApkRoot, 'release', 'app-release-unsigned.apk'),
  path.join(gradleApkRoot, 'debug', 'app-debug.apk'),
];
const buildInfoPath = path.join(mobileDir, 'build-info.json');
const latestFilename = process.env.APK_FILENAME || 'oleachron-alpha.apk';
const pipelineBuildId = process.env.BUILD_ID || '';

let apkSource = process.env.APK_SOURCE ? path.resolve(process.env.APK_SOURCE) : defaultApk;

if (!fs.existsSync(apkSource)) {
  const explicitGradleApk = gradleApkCandidates.find((candidate) => fs.existsSync(candidate));
  const fallback = explicitGradleApk || findNewestApk(gradleApkRoot);
  if (fallback) {
    console.warn(`APK not at ${apkSource}; using Gradle output: ${fallback}`);
    apkSource = fallback;
    if (!fs.existsSync(defaultApk)) {
      fs.copyFileSync(fallback, defaultApk);
      console.log(`Copied to canonical path: ${defaultApk}`);
    }
  }
}

if (!fs.existsSync(apkSource)) {
  console.error('ERROR: APK not found.');
  console.error('  Expected:', defaultApk);
  console.error('  APK_SOURCE:', process.env.APK_SOURCE || '(unset)');
  console.error('  Repo root:', repoRoot);
  console.error('  mobile/ contents:\n  ', listDirSummary(mobileDir));
  console.error('  Gradle outputs:', listDirSummary(gradleApkRoot));
  const anyApk = findNewestApk(mobileDir);
  if (anyApk) {
    console.error('  Newest .apk under mobile/:', anyApk);
  }
  process.exit(1);
}

fs.mkdirSync(downloadsDir, { recursive: true });

let buildInfo = {};
if (fs.existsSync(buildInfoPath)) {
  buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
}

const version = buildInfo.version || '1.0.0';
const versionCode = buildInfo.versionCode || pipelineBuildId;
const archiveName = `olivecycle-${version}-b${versionCode}.apk`;

fs.copyFileSync(apkSource, path.join(downloadsDir, latestFilename));
fs.copyFileSync(apkSource, path.join(downloadsDir, archiveName));

const manifest = {
  available: true,
  version,
  versionCode: Number(versionCode) || versionCode,
  buildId: String(buildInfo.buildId || pipelineBuildId),
  builtAt: buildInfo.builtAt || new Date().toISOString(),
  builder: buildInfo.builder || 'gradle-agent',
  filename: latestFilename,
  url: `/downloads/${latestFilename}`,
  archiveFilename: archiveName,
  archiveUrl: `/downloads/${archiveName}`,
  apiUrl: buildInfo.apiUrl,
};

fs.writeFileSync(
  path.join(downloadsDir, 'latest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log('Staged APK for frontend:');
console.log(`  source: ${apkSource}`);
console.log(`  latest: ${path.join(downloadsDir, latestFilename)}`);
console.log('Landing page download manifest:');
console.log(JSON.stringify(manifest, null, 2));
