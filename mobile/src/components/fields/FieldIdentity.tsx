import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel, getLifecycleStageLabel } from '../../utils/fieldDisplay';

type Props = {
  field: Field;
  size?: 'card' | 'page';
  showMeta?: boolean;
};

const FieldIdentity: React.FC<Props> = ({ field, size = 'card', showMeta = true }) => {
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common']);
  const shortLocation = getFieldShortLocation(field);
  const status = getFieldStatusLabel(field.status, t);
  const stage = getLifecycleStageLabel(field.currentLifecycleStage, t);
  const variety = field.variety || field.oliveVariety;
  const area = formatFieldArea(field);
  const meta = [status, variety, area, size === 'page' ? stage : null].filter(Boolean) as string[];

  return (
    <View style={styles.wrap}>
      <Text
        style={[
          size === 'page' ? styles.pageName : styles.cardName,
          { color: colors.textPrimary },
        ]}
        numberOfLines={size === 'page' ? 3 : 2}
      >
        {field.name}
      </Text>
      {shortLocation ? (
        <Text style={[styles.place, { color: colors.textSecondary }]} numberOfLines={1}>
          {shortLocation}
        </Text>
      ) : null}
      {showMeta && meta.length > 0 ? (
        <Text style={[styles.meta, { color: colors.textTertiary }]} numberOfLines={2}>
          {meta.join(' · ')}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, minWidth: 0, gap: 2 },
  pageName: { ...typography.styles.h2, fontWeight: '800', fontSize: 24, lineHeight: 30 },
  cardName: { ...typography.styles.body, fontWeight: '800', fontSize: 17, lineHeight: 22 },
  place: { ...typography.styles.bodySmall, marginTop: 2 },
  meta: { ...typography.styles.caption, marginTop: spacing.xs, fontWeight: '600' },
});

export default FieldIdentity;
