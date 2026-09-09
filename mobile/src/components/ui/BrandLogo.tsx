import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';

const horizontalOnLight = require('../../../assets/logo-horizontal-light.png');
const horizontalOnDark = require('../../../assets/logo-horizontal-dark.png');
const markOnLight = require('../../../assets/logo.png');
const markOnDark = require('../../../assets/logo-light.png');
const wordmarkOnLight = require('../../../assets/logo-wordmark-light.png');
const wordmarkOnDark = require('../../../assets/logo-wordmark-dark.png');

type Variant = 'horizontal' | 'stacked' | 'mark';
type Tone = 'on-light' | 'on-dark';

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
  tone?: Tone;
  variant?: Variant;
};

const BrandLogo: React.FC<Props> = ({ size = 36, style, tone = 'on-light', variant = 'horizontal' }) => {
  if (variant === 'stacked') {
    const mark = tone === 'on-dark' ? markOnDark : markOnLight;
    const word = tone === 'on-dark' ? wordmarkOnDark : wordmarkOnLight;
    return (
      <View style={styles.stacked}>
        <Image source={mark} style={{ width: size, height: size }} resizeMode="contain" accessibilityElementsHidden />
        <Image
          source={word}
          style={{ width: Math.round(size * 3.2), height: Math.round(size * 0.72) }}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="Oleachron"
        />
      </View>
    );
  }

  if (variant === 'mark') {
    return (
      <Image
        source={tone === 'on-dark' ? markOnDark : markOnLight}
        style={[{ width: size, height: size }, style]}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Oleachron"
      />
    );
  }

  const height = size;
  const width = Math.round(size * 4.8);
  return (
    <Image
      source={tone === 'on-dark' ? horizontalOnDark : horizontalOnLight}
      style={[styles.logo, { width, height }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Oleachron"
    />
  );
};

const styles = StyleSheet.create({
  logo: { flexShrink: 1 },
  stacked: { alignItems: 'center', gap: 10 },
});

export default BrandLogo;
