#!/usr/bin/env node
/**
 * Set android versionCode after expo prebuild so mutating app.json does not
 * bust the CI prebuild stamp (which would force --clean every run).
 */
const fs = require('fs');
const path = require('path');

const buildId = Math.max(1, parseInt(process.env.BUILD_ID || process.env.BUILD_BUILDID || '1', 10));
const androidDir = path.join(__dirname, '..', 'android', 'app');
const groovy = path.join(androidDir, 'build.gradle');
const kotlin = path.join(androidDir, 'build.gradle.kts');
const file = fs.existsSync(groovy) ? groovy : fs.existsSync(kotlin) ? kotlin : null;

if (!file) {
  console.error('ERROR: android/app/build.gradle not found — run expo prebuild first');
  process.exit(1);
}

let content = fs.readFileSync(file, 'utf8');
const marker = '// oleachron-ci-version-code';

if (file.endsWith('.kts')) {
  if (content.includes('versionCode =')) {
    content = content.replace(/versionCode\s*=\s*\d+/, `${marker}\n            versionCode = ${buildId}`);
  } else {
    console.error('ERROR: versionCode not found in build.gradle.kts');
    process.exit(1);
  }
} else if (/versionCode\s+\d+/.test(content)) {
  content = content.replace(/versionCode\s+\d+/, `${marker}\n        versionCode ${buildId}`);
} else {
  console.error('ERROR: versionCode not found in build.gradle');
  process.exit(1);
}

fs.writeFileSync(file, content);
console.log(`Patched ${path.basename(file)}: versionCode ${buildId}`);
