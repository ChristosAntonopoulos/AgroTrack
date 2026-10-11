/**
 * Web stand-in for react-native-purchases. Billing stays on the device apps;
 * the browser build must not pull the native SDK.
 */
const stub = {
  PACKAGE_TYPE: {
    ANNUAL: 'ANNUAL',
    MONTHLY: 'MONTHLY',
    UNKNOWN: 'UNKNOWN',
  },
  configure: async () => {},
  logIn: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  logOut: async () => ({ entitlements: { active: {} } }),
  getOfferings: async () => ({ current: null }),
  purchasePackage: async () => {
    throw new Error('Purchases are available in the iOS and Android apps.');
  },
  restorePurchases: async () => ({ entitlements: { active: {} } }),
};

module.exports = stub;
module.exports.default = stub;
