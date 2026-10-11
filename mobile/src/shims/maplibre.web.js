/**
 * Web stand-in for @maplibre/maplibre-react-native.
 * The real package is native-only. Screens already hide the map when the native
 * module is missing, but Metro still bundles those imports for the web export.
 */
const React = require('react');
const { View } = require('react-native');

const Stub = React.forwardRef((props, ref) =>
  React.createElement(View, { ref, style: props && props.style, collapsable: false })
);
Stub.displayName = 'MapLibreWebStub';

const stub = new Proxy(
  { __esModule: true, default: Stub },
  {
    get(target, prop) {
      if (prop in target) return target[prop];
      return Stub;
    },
  }
);

module.exports = stub;
