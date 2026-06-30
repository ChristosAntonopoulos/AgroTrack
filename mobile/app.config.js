/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  appJson.expo?.android?.config?.googleMaps?.apiKey ||
  '';

const isPlaceholderKey =
  !googleMapsApiKey || googleMapsApiKey.includes('YOUR_GOOGLE_MAPS_API_KEY');

module.exports = () => ({
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      config: {
        ...appJson.expo.android.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    extra: {
      ...appJson.expo.extra,
      googleMapsApiKey,
      googleMapsConfigured: !isPlaceholderKey,
    },
  },
});
