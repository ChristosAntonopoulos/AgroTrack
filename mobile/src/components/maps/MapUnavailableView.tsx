import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

type MapUnavailableViewProps = {
  style?: StyleProp<ViewStyle>;
};

const MapUnavailableView: React.FC<MapUnavailableViewProps> = ({ style }) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceMuted }, style]}>
      <Ionicons name="map-outline" size={40} color={colors.textSecondary} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('mapUnavailable')}
      </Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {t('mapRequiresNativeBuild')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
});

export default MapUnavailableView;
