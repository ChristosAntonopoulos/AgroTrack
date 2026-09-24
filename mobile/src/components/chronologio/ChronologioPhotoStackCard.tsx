import React, { useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioEntry } from '../../services/chronologioService';
import { resolvePublicAssetUrl } from '../../config/env';
import { collectChronologioImages } from '../../utils/chronologioPhotoGroups';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import { radii, spacing, typography } from '../../theme';

type Props = {
  entries: ChronologioEntry[];
  showField?: boolean;
  minHeight?: number;
  onPress: () => void;
};

const ChronologioPhotoStackCard: React.FC<Props> = ({
  entries,
  showField = false,
  onPress,
}) => {
  const { t, i18n } = useTranslation(['photos', 'chronologio']);
  const { colors } = useTheme();
  const images = useMemo(() => collectChronologioImages(entries), [entries]);
  const thumbs = images
    .slice(0, 4)
    .map((m) => resolvePublicAssetUrl(m.thumbnailUrl || m.url) || m.thumbnailUrl || m.url || '')
    .filter(Boolean);
  const count = Math.max(images.length, entries.length);
  const fieldIds = [
    ...new Set(entries.map((e) => e.fieldId || e.field?.id).filter(Boolean) as string[]),
  ];
  const singleField =
    fieldIds.length === 1
      ? entries.find((e) => (e.fieldId || e.field?.id) === fieldIds[0])
      : null;
  const fieldColor =
    singleField != null ? resolveFieldColor(singleField.field?.color, fieldIds[0]) : null;
  const fieldNames = showField
    ? [
        ...new Set(
          entries
            .map((e) => (e.field?.name ? friendlyFieldLabel(e.field.name) : ''))
            .filter(Boolean)
        ),
      ]
    : [];
  const time = (() => {
    const d = new Date(entries[0]?.occurredAt || '');
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  })();

  const collageMode =
    thumbs.length >= 4 ? 'quad' : thumbs.length === 3 ? 'tri' : thumbs.length === 2 ? 'duo' : 'single';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('photos:dayStack.openSheet')}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: pressed ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.iconWrap, { backgroundColor: colors.border }]}>
          <Ionicons name="camera-outline" size={16} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.kicker, { color: colors.textSecondary }]}>
            {t('photos:dayStack.title')}
          </Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('photos:dayStack.count', { count })}
          </Text>
        </View>
      </View>

      <View style={[styles.collage, collageMode === 'single' && styles.collageSingle]}>
        {thumbs.length === 0 ? (
          <View style={[styles.fallback, { backgroundColor: '#1f2a1c' }]}>
            <Ionicons name="camera-outline" size={28} color="#f4f7f2" />
          </View>
        ) : collageMode === 'single' ? (
          <Image source={{ uri: thumbs[0] }} style={styles.fill} />
        ) : collageMode === 'duo' ? (
          <View style={styles.row}>
            {thumbs.map((uri, i) => (
              <Image key={`${uri}-${i}`} source={{ uri }} style={styles.half} />
            ))}
          </View>
        ) : collageMode === 'tri' ? (
          <View style={styles.row}>
            <Image source={{ uri: thumbs[0] }} style={styles.hero} />
            <View style={styles.stack}>
              <Image source={{ uri: thumbs[1] }} style={styles.stackCell} />
              <Image source={{ uri: thumbs[2] }} style={styles.stackCell} />
            </View>
          </View>
        ) : (
          <View style={styles.quad}>
            <View style={styles.quadRow}>
              <Image source={{ uri: thumbs[0] }} style={styles.quadCell} />
              <Image source={{ uri: thumbs[1] }} style={styles.quadCell} />
            </View>
            <View style={styles.quadRow}>
              <Image source={{ uri: thumbs[2] }} style={styles.quadCell} />
              <Image source={{ uri: thumbs[3] }} style={styles.quadCell} />
            </View>
          </View>
        )}
        {fieldColor ? <View style={[styles.fieldDot, { backgroundColor: fieldColor }]} /> : null}
        {count > 4 ? (
          <View style={styles.more}>
            <Text style={styles.moreText}>+{count - 4}</Text>
          </View>
        ) : null}
      </View>

      {(fieldNames.length > 0 || time) ? (
        <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
          {[time, fieldNames.join(' · ')].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
    </Pressable>
  );
};

const GAP = 6;

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    ...typography.styles.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  title: {
    ...typography.styles.body,
    fontWeight: '700',
  },
  collage: {
    width: '100%',
    height: 196,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(31, 42, 28, 0.12)',
  },
  collageSingle: {
    height: 176,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  half: {
    flex: 1,
  },
  hero: {
    flex: 1.4,
  },
  stack: {
    flex: 1,
    gap: GAP,
  },
  stackCell: {
    flex: 1,
  },
  quad: {
    flex: 1,
    gap: GAP,
  },
  quadRow: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
  },
  quadCell: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldDot: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  more: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(20, 28, 18, 0.82)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  moreText: {
    color: '#f4f7f2',
    fontSize: 12,
    fontWeight: '700',
  },
  sub: {
    ...typography.styles.caption,
  },
});

export default ChronologioPhotoStackCard;
