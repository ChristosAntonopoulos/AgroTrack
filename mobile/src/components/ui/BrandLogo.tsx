import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet } from 'react-native';

const logoSource = require('../../../assets/logo.png');

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
  rounded?: boolean;
};

const BrandLogo: React.FC<Props> = ({ size = 48, style, rounded = true }) => (
  <Image
    source={logoSource}
    style={[
      styles.logo,
      { width: size, height: size, borderRadius: rounded ? Math.round(size * 0.18) : 0 },
      style,
    ]}
    resizeMode="contain"
    accessibilityRole="image"
    accessibilityLabel="AgroTrack logo"
  />
);

const styles = StyleSheet.create({
  logo: {
    flexShrink: 0,
  },
});

export default BrandLogo;
