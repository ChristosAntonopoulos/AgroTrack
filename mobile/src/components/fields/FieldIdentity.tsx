import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, radii } from '../../theme';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel, getLifecycleStageLabel } from '../../utils/fieldDisplay';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';

type Props = {
  field: Field;
  size?: 'card' | 'page';
  showMeta?: boolean;
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
  hideTitle = false,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common']);
  const displayName = friendlyFieldLabel(field.name);
  const shortLocation = getFieldShortLocation(field);
  const status = getFieldStatusLabel(field.status, t);
  const stage = getLifecycleStageLabel(field.currentLifecycleStage, t);
  const variety = field.variety || field.oliveVariety;
  const area = formatFieldArea(field);
  const accent = resolveFieldColor(field.color, field.id);
  const isPage = size === 'page';
  const contentIndent = hideTitle ? 0 : isPage ? 24 : 22;

  const chips: MetaChip[] = [];
  if (status) chips.push({ key: 'status', label: status, kind: 'status' });
  if (variety) chips.push({ key: 'variety', label: variety, kind: 'variety' });
  if (area) chips.push({ key: 'area', label: area, kind: 'area' });
  if (isPage && stage) chips.push({ key: 'stage', label: stage, kind: 'stage' });

  return (
    <View style={styles.wrap} accessibilityLabel={t('fields:card.metaAria')}>
      {!hideTitle ? (
        <View style={styles.titleRow}>
          <View
            style={[
              styles.swatch,
              isPage && styles.swatchPage,
              { backgroundColor: accent, borderColor: colors.surface },
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
      ) : (
        <View style={[styles.swatchTiny, { backgroundColor: accent }]} />
      )}
      {shortLocation ? (
        <Text
          style={[
            styles.place,
            isPage && styles.placePage,
            { color: colors.textSecondary, marginLeft: contentIndent },
          ]}
          numberOfLines={1}
        >
          {shortLocation}
        </Text>
      ) : null}
      {showMeta && chips.length > 0 ? (
        <View style={[styles.chips, { marginLeft: contentIndent }]} accessibilityRole="list">
          {chips.map((chip) => {
            const chipStyle =
              chip.kind === 'status'
                ? {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.oliveBorder,
                    color: colors.link,
                  }
                : chip.kind === 'area'
                  ? {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.borderLight,
                      color: colors.textPrimary,
                    }
                  : {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                      color: colors.textSecondary,
                    };
            return (
              <View
                key={chip.key}
                style={[
                  styles.chip,
                  isPage && styles.chipPage,
                  {
                    backgroundColor: chipStyle.backgroundColor,
                    borderColor: chipStyle.borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isPage && styles.chipTextPage,
                    { color: chipStyle.color },
                  ]}
                >
                  {chip.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 99,
    borderWidth: 2,
    flexShrink: 0,
  },
  swatchPage: {
    width: 14,
    height: 14,
  },
  swatchTiny: {
    width: 8,
    height: 8,
    borderRadius: 99,
    marginBottom: 4,
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
  placePage: { fontSize: 16, marginTop: 8 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 28,
    justifyContent: 'center',
  },
  chipPage: {
    minHeight: 32,
    paddingHorizontal: 12,
  },
  chipText: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextPage: {
    fontSize: 14,
  },
});

export default FieldIdentity;
