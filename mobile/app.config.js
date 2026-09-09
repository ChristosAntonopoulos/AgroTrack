/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const isCi = process.env.CI === '1' || process.env.CI === 'true';

const DEV_CLIENT_PLUGINS = new Set(['expo-dev-client']);

const DEV_CLIENT_PACKAGES = [
  'expo-dev-client',
  'expo-dev-launcher',
  'expo-dev-menu',
  'expo-dev-menu-interface',
];

function pluginName(plugin) {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

module.exports = () => {
  const plugins = (appJson.expo.plugins || []).filter(
    (plugin) => !(isCi && DEV_CLIENT_PLUGINS.has(pluginName(plugin))),
  );

  return {
    expo: {
      ...appJson.expo,
      plugins,
      ...(isCi
        ? {
            autolinking: {
              ...(appJson.expo.autolinking || {}),
              exclude: [
                ...new Set([
                  ...((appJson.expo.autolinking && appJson.expo.autolinking.exclude) || []),
                  ...DEV_CLIENT_PACKAGES,
                ]),
              ],
            },
          }
        : {}),
    },
  };
};
