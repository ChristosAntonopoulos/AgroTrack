import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel, getLifecycleStageLabel } from '../../utils/fieldDisplay';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { hexToRgba } from '../../utils/hexToRgba';

type Props = {
  field: Field;
  size?: 'card' | 'page';
  showMeta?: boolean;
};

const FieldIdentity: React.FC<Props> = ({ field, size = 'card', showMeta = true }) => {
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common']);
  const displayName = friendlyFieldLabel(field.name);
  const shortLocation = getFieldShortLocation(field);
  const status = getFieldStatusLabel(field.status, t);
  const stage = getLifecycleStageLabel(field.currentLifecycleStage, t);
  const variety = field.variety || field.oliveVariety;
  const area = formatFieldArea(field);
  const meta = [status, variety, area, size === 'page' ? stage : null].filter(Boolean) as string[];
  const accent = resolveFieldColor(field.color, field.id);
  const isPage = size === 'page';

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.titleBlock,
          isPage ? styles.titleBlockPage : styles.titleBlockCard,
          {
            backgroundColor: hexToRgba(accent, isPage ? 0.26 : 0.18),
            borderColor: hexToRgba(accent, isPage ? 0.42 : 0.3),
            shadowColor: accent,
          },
        ]}
      >
        <View style={[styles.accentBar, isPage && styles.accentBarPage, { backgroundColor: accent }]} />
        <View
          pointerEvents="none"
          style={[
            styles.shadeFade,
            { backgroundColor: hexToRgba(accent, isPage ? 0.16 : 0.1) },
          ]}
        />
        <Text
          style={[
            isPage ? styles.pageName : styles.cardName,
            { color: colors.textPrimary, flex: 1 },
          ]}
          numberOfLines={isPage ? 3 : 2}
        >
          {displayName}
        </Text>
      </View>
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
  titleBlock: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 3,
  },
  titleBlockCard: {
    borderRadius: 10,
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 12,
  },
  titleBlockPage: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 16,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 99,
    minHeight: 18,
  },
  accentBarPage: {
    width: 6,
    minHeight: 26,
  },
  shadeFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '68%',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  pageName: { ...typography.styles.h2, fontWeight: '800', fontSize: 26, lineHeight: 32, zIndex: 1 },
  cardName: { ...typography.styles.body, fontWeight: '800', fontSize: 17, lineHeight: 22, zIndex: 1 },
  place: { ...typography.styles.bodySmall, marginTop: 4 },
  meta: { ...typography.styles.caption, marginTop: spacing.xs, fontWeight: '600' },
});

export default FieldIdentity;
