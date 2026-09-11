import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioEntry } from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { presentChronologioEvent } from '../../chronologio/eventPresentation';
import { resolveFieldColor } from '../../utils/fieldColors';
import { resolveChronologioCategoryAccent } from '../../utils/chronologioCategoryAccents';
import CardAccentFades from '../common/CardAccentFades';
import { radii } from '../../theme';

type Props = {
  entry: ChronologioEntry;
  showField?: boolean;
  numberLocale: string;
  minHeight?: number;
  onPress: () => void;
};

const iconFor = (category: string): React.ComponentProps<typeof Ionicons>['name'] => {
  switch (category) {
    case 'task':
      return 'checkbox-outline';
    case 'expense':
      return 'wallet-outline';
    case 'harvest':
      return 'leaf-outline';
    case 'note':
      return 'document-text-outline';
    case 'weather':
      return 'rainy-outline';
    case 'intelligence':
      return 'sparkles-outline';
    case 'lifecycle':
      return 'git-branch-outline';
    case 'collaborator':
      return 'people-outline';
    case 'photo':
      return 'camera-outline';
    default:
      return 'ellipse-outline';
  }
};

const isRealMedia = (url?: string | null) => {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.includes('unsplash') || u.includes('picsum') || u.includes('placeholder')) return false;
  return u.includes('/uploads/') || u.startsWith('file:') || u.startsWith('content:') || u.startsWith('http');
};

const pickThumb = (entry: ChronologioEntry): string | undefined => {
  for (const m of entry.media || []) {
    const candidate = m.thumbnailUrl || m.url;
    if (isRealMedia(candidate)) return candidate!;
  }
  return undefined;
};

const ChronologioEntryCard: React.FC<Props> = ({
  entry,
  showField = false,
  numberLocale,
  minHeight = 44,
  onPress,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const presented = presentChronologioEvent(entry, i18n.language);
  const { colors } = useTheme();
  const fieldAccent = resolveFieldColor(entry.field?.color, entry.fieldId);
  const categoryAccent = resolveChronologioCategoryAccent(
    entry.category,
    String(entry.importance)
  );
  const thumb = pickThumb(entry);
  const extraPhotos = Math.max(0, (entry.media?.length || 0) - 1);
  const time = new Date(entry.occurredAt).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const metaBits: string[] = [];
  if (entry.amount && entry.amount.value > 0 && (entry.category === 'expense' || entry.category === 'income' || entry.category === 'task')) {
    metaBits.push(formatChronologioMoney(entry.amount.value, entry.amount.currency, numberLocale));
  }
  if (entry.category === 'harvest' && entry.details.harvest?.oliveKg) {
    metaBits.push(
      t('harvestOlives', { kg: Math.round(entry.details.harvest.oliveKg).toLocaleString(numberLocale) })
    );
    if (entry.details.harvest.oilKg != null && entry.details.harvest.oilKg > 0) {
      metaBits.push(
        t('harvestOil', {
          kg: Math.round(entry.details.harvest.oilKg).toLocaleString(numberLocale),
        })
      );
    }
    if (entry.details.harvest.oilYieldPercent != null && entry.details.harvest.oilYieldPercent > 0) {
      metaBits.push(t('harvestYield', { pct: entry.details.harvest.oilYieldPercent }));
    }
  }
  if (entry.summary && entry.category === 'note') {
    metaBits.push(entry.summary);
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          borderColor: colors.borderLight,
          backgroundColor: colors.surface,
          minHeight,
          borderLeftColor: fieldAccent,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <CardAccentFades fieldColor={fieldAccent} endColor={categoryAccent} />

      <View style={styles.row}>
        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Ionicons name={iconFor(entry.category)} size={14} color={categoryAccent} />
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
              {time} · {presented.shortLabel}
            </Text>
          </View>
          <Text style={{ fontWeight: '700', color: colors.textPrimary, marginTop: 4, fontSize: 16 }}>
            {presented.label}
          </Text>
          {metaBits.length > 0 ? (
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }} numberOfLines={2}>
              {metaBits.join(' · ')}
            </Text>
          ) : null}
          {showField && entry.field?.name ? (
            <View style={styles.fieldRow}>
              <View style={[styles.fieldDot, { backgroundColor: fieldAccent }]} />
              <Text style={{ color: colors.textSecondary, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>
                {entry.field.name}
              </Text>
            </View>
          ) : null}
        </View>
        {thumb ? (
          <View style={styles.thumbWrap}>
            <Image source={{ uri: thumb }} style={styles.thumb} />
            {extraPhotos > 0 ? (
              <View style={[styles.thumbBadge, { backgroundColor: colors.charcoal + 'B8' }]}>
                <Text style={[styles.thumbBadgeText, { color: colors.onOlive }]}>+{extraPhotos}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: radii.xl,
    padding: 12,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', zIndex: 1 },
  body: { flex: 1, minWidth: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  fieldDot: { width: 8, height: 8, borderRadius: 99 },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  thumbBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  thumbBadgeText: { fontSize: 10, fontWeight: '700' },
});

export default ChronologioEntryCard;
