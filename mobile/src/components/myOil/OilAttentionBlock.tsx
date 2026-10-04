import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  children: React.ReactNode;
  show: boolean;
};

export function OilAttentionBlock({ children, show }: Props) {
  const { t } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  if (!show) return null;
  return (
    <View
      style={{
        gap: 10,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceMuted,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="warning-outline" size={14} color={colors.accentGold} />
        <Text style={[styles.byGroveTitle, { fontSize: 14 }]}>{t('attention.title')}</Text>
      </View>
      {children}
    </View>
  );
}
