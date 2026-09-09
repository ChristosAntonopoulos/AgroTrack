import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel } from '../../utils/fieldDisplay';
import { spacing } from '../../theme';

type Props = { field: Field };

const FieldFacts: React.FC<Props> = ({ field }) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const variety = field.variety || field.oliveVariety;
  const place = getFieldShortLocation(field);

  const rows: Array<{ label: string; value: string }> = [
    { label: t('overview.area'), value: formatFieldArea(field) },
    ...(variety ? [{ label: t('overview.variety'), value: variety }] : []),
    ...(place ? [{ label: t('locationLabel'), value: place }] : []),
    { label: t('overview.status'), value: getFieldStatusLabel(field.status, t) },
  ];

  return (
    <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={{ color: colors.textTertiary }}>{row.label}</Text>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', flex: 1, textAlign: 'right' }}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  block: { borderWidth: 1, borderRadius: 14, padding: spacing.md, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});

export default FieldFacts;
