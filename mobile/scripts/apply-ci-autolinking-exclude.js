#!/usr/bin/env node
/**
 * CI release APKs do not need expo-dev-client. Exclude it from Expo autolinking
 * (package.json) so Gradle skips expo-dev-menu / launcher / interface modules.
 * Local `npm run android` does not run this script.
 */
const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const exclude = [
  'expo-dev-client',
  'expo-dev-launcher',
  'expo-dev-menu',
  'expo-dev-menu-interface',
];

pkg.expo = pkg.expo || {};
pkg.expo.autolinking = pkg.expo.autolinking || {};
pkg.expo.autolinking.exclude = [
  ...new Set([...(pkg.expo.autolinking.exclude || []), ...exclude]),
];

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
console.log('CI autolinking exclude:', pkg.expo.autolinking.exclude.join(', '));
