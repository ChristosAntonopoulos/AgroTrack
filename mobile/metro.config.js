const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/** Native-only packages. Web export resolves these to JS stubs so the browser build can load. */
const webStubs = {
  '@maplibre/maplibre-react-native': path.resolve(__dirname, 'src/shims/maplibre.web.js'),
  'react-native-purchases': path.resolve(__dirname, 'src/shims/purchases.web.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webStubs[moduleName]) {
    return { type: 'sourceFile', filePath: webStubs[moduleName] };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
