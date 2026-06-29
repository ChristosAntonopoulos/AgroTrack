#!/usr/bin/env node
/**
 * Alpha CI builds: sign release APK with the debug keystore so Gradle embeds the JS bundle
 * without needing Metro or a production keystore.
 */
const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android', 'app');
const groovy = path.join(androidDir, 'build.gradle');
const kotlin = path.join(androidDir, 'build.gradle.kts');
const file = fs.existsSync(groovy) ? groovy : fs.existsSync(kotlin) ? kotlin : null;

if (!file) {
  console.error('ERROR: android/app/build.gradle not found — run expo prebuild first');
  process.exit(1);
}

const marker = '// agrotrack-alpha-release-signing';
let content = fs.readFileSync(file, 'utf8');

if (content.includes(marker)) {
  console.log('Release signing already patched for alpha builds');
  process.exit(0);
}

if (file.endsWith('.kts')) {
  if (!content.includes('signingConfigs.getByName("debug")')) {
    const replaced = content.replace(
      /release\s*\{/,
      `release {\n            ${marker}\n            signingConfig = signingConfigs.getByName("debug")`,
    );
    if (replaced === content) {
      console.error('ERROR: Could not patch release block in build.gradle.kts');
      process.exit(1);
    }
    content = replaced;
  }
} else if (!/release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.debug/.test(content)) {
  const replaced = content.replace(
    /release\s*\{/,
    `release {\n            ${marker}\n            signingConfig signingConfigs.debug`,
  );
  if (replaced === content) {
    console.error('ERROR: Could not patch release block in build.gradle');
    process.exit(1);
  }
  content = replaced;
}

fs.writeFileSync(file, content);
console.log(`Patched ${path.basename(file)}: release uses debug keystore (bundled JS, no Metro)`);
