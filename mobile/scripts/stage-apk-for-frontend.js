#!/usr/bin/env node
/**
 * Copy built APK into frontend/public/downloads for nginx serving.
 * Writes latest.json manifest (and optional versioned archive copy).
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const downloadsDir = path.join(repoRoot, 'frontend', 'public', 'downloads');
const apkSource = path.join(repoRoot, 'mobile', 'agrotrack-mobile.apk');
const buildInfoPath = path.join(repoRoot, 'mobile', 'build-info.json');
const latestFilename = process.env.APK_FILENAME || 'olivecycle-alpha.apk';
const pipelineBuildId = process.env.BUILD_ID || '';

if (!fs.existsSync(apkSource)) {
  console.error('ERROR: APK not found at', apkSource);
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

console.log('Landing page download manifest:');
console.log(JSON.stringify(manifest, null, 2));
