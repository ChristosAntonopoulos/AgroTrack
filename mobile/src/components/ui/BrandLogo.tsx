import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet } from 'react-native';

const horizontalOnLight = require('../../../assets/logo-horizontal-light.png');
const horizontalOnDark = require('../../../assets/logo-horizontal-dark.png');
const stackedOnLight = require('../../../assets/logo-stacked-light.png');
const stackedOnDark = require('../../../assets/logo-stacked-dark.png');
const markOnLight = require('../../../assets/logo.png');
const markOnDark = require('../../../assets/logo-light.png');

type Variant = 'horizontal' | 'stacked' | 'mark';
type Tone = 'on-light' | 'on-dark';

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
  tone?: Tone;
  variant?: Variant;
};

/** Trimmed asset aspects (width / height). */
const ASPECT = {
  horizontal: 4.19,
  stacked: 1.325,
  mark: 1.02,
} as const;

const BrandLogo: React.FC<Props> = ({ size = 44, style, tone = 'on-light', variant = 'horizontal' }) => {
  if (variant === 'stacked') {
    const height = size;
    const width = Math.round(size * ASPECT.stacked);
    return (
      <Image
        source={tone === 'on-dark' ? stackedOnDark : stackedOnLight}
        style={[{ width, height }, style]}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="The Olive Lot"
      />
    );
  }

  if (variant === 'mark') {
    const height = size;
    const width = Math.round(size * ASPECT.mark);
    return (
      <Image
        source={tone === 'on-dark' ? markOnDark : markOnLight}
        style={[{ width, height }, style]}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="The Olive Lot"
      />
    );
  }

  const height = size;
  const width = Math.round(size * ASPECT.horizontal);
  return (
    <Image
      source={tone === 'on-dark' ? horizontalOnDark : horizontalOnLight}
      style={[styles.logo, { width, height }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="The Olive Lot"
    />
  );
};

const styles = StyleSheet.create({
  logo: { flexShrink: 1 },
});

export default BrandLogo;
