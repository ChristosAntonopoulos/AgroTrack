import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import type { FieldPhenology } from '../../services/fieldWorkService';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, radii } from '../../theme';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel } from '../../utils/fieldDisplay';
import { resolveFieldStageLabel } from '../../utils/fieldStage';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';

type Props = {
  field: Field;
  size?: 'card' | 'page';
  showMeta?: boolean;
  phenology?: FieldPhenology | null;
  /** Hide the large title block when the native stack header already shows the field name. */
  hideTitle?: boolean;
};

type MetaChip = {
  key: string;
  label: string;
  kind: 'status' | 'variety' | 'area' | 'stage';
};

/**
 * Shared field identity — quiet title + circular colour mark (matches web information).
 */
const FieldIdentity: React.FC<Props> = ({
  field,
  size = 'card',
  showMeta = true,
  phenology,
  hideTitle = false,
}) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation(['fields', 'common']);
  const displayName = friendlyFieldLabel(field.name);
  const shortLocation = getFieldShortLocation(field);
  const status = getFieldStatusLabel(field.status, t);
  const stage = resolveFieldStageLabel({
    phenology,
    currentLifecycleStage: field.currentLifecycleStage,
    t,
  });
  const varietyRaw = field.variety || field.oliveVariety;
  const variety = varietyRaw
    ? t(`fields:addField.varietyOptions.${varietyRaw}`, {
        defaultValue: t(`fields:varietyOptions.${varietyRaw}`, { defaultValue: varietyRaw }),
      })
    : null;
  const locale = i18n.language?.startsWith('el')
    ? 'el'
    : i18n.language?.startsWith('it')
      ? 'it'
      : 'en';
  const area = formatFieldArea(field, locale);
  const accent = resolveFieldColor(field.color, field.id);
  const isPage = size === 'page';

  const chips: MetaChip[] = [];
  if (status) chips.push({ key: 'status', label: status, kind: 'status' });
  if (area && area !== '—') chips.push({ key: 'area', label: area, kind: 'area' });
  if (isPage && stage) chips.push({ key: 'stage', label: stage, kind: 'stage' });
  // Variety lives on the field page only — list cards keep the grove name clean.
  if (isPage && variety) chips.push({ key: 'variety', label: variety, kind: 'variety' });

  const tint = accent.length === 7 ? `${accent}22` : colors.primaryLight;

  return (
    <View style={[styles.wrap, !isPage && styles.wrapFlex]} accessibilityLabel={t('fields:card.metaAria')}>
      {isPage && shortLocation ? (
        <Text style={[styles.placePage, { color: colors.textSecondary }]} numberOfLines={1}>
          {shortLocation}
        </Text>
      ) : null}
      {!hideTitle ? (
        <View
          style={[
            styles.titleRow,
            isPage && styles.namePlate,
            isPage && { backgroundColor: tint, borderColor: accent },
          ]}
        >
          <View
            style={[
              styles.swatch,
              isPage && styles.swatchPage,
              { backgroundColor: accent, borderColor: isPage ? accent : colors.surface },
            ]}
            accessibilityElementsHidden
          />
          <Text
            style={[
              isPage ? styles.pageName : styles.cardName,
              { color: colors.textPrimary },
            ]}
            numberOfLines={isPage ? 3 : 2}
          >
            {displayName}
          </Text>
        </View>
      ) : null}
      {!isPage && shortLocation ? (
        <Text
          style={[styles.place, { color: colors.textSecondary, marginLeft: hideTitle ? 0 : 22 }]}
          numberOfLines={1}
        >
          {shortLocation}
        </Text>
      ) : null}
      {showMeta && chips.length > 0 ? (
        <View style={styles.chips} accessibilityRole="list">
          {chips.map((chip) => {
            const chipStyle =
              chip.kind === 'status'
                ? {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.oliveBorder,
                    color: colors.primary,
                  }
                : {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: 'transparent',
                    color: colors.textSecondary,
                  };
            return (
              <View
                key={chip.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: chipStyle.backgroundColor,
                    borderColor: chipStyle.borderColor,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: chipStyle.color }]}>{chip.label}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { minWidth: 0 },
  wrapFlex: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
  },
  namePlate: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 99,
    borderWidth: 2,
    flexShrink: 0,
  },
  swatchPage: {
    width: 18,
    height: 18,
    borderWidth: 0,
  },
  pageName: {
    ...typography.styles.h2,
    fontWeight: '800',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    flex: 1,
  },
  cardName: {
    ...typography.styles.body,
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.25,
    flex: 1,
  },
  place: { ...typography.styles.bodySmall, marginTop: 6 },
  placePage: { ...typography.styles.bodySmall, fontSize: 15, fontWeight: '600' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minHeight: 26,
    justifyContent: 'center',
  },
  chipText: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 12,
  },
});

export default FieldIdentity;
