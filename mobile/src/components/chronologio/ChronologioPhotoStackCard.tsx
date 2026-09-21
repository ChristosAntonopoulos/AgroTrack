import React, { useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioEntry } from '../../services/chronologioService';
import { resolvePublicAssetUrl } from '../../config/env';
import { collectChronologioImages } from '../../utils/chronologioPhotoGroups';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
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
  minHeight = 120,
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

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('photos:dayStack.openSheet')}
      style={({ pressed }) => [
        styles.card,
        {
          minHeight,
          backgroundColor: colors.surface,
          borderColor: pressed ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.collage}>
        {thumbs.length === 0 ? (
          <View style={[styles.fallback, { backgroundColor: '#1f2a1c' }]}>
            <Ionicons name="camera-outline" size={28} color="#f4f7f2" />
          </View>
        ) : (
          <View style={styles.grid}>
            {thumbs.map((uri, i) => (
              <Image key={`${uri}-${i}`} source={{ uri }} style={styles.cell} />
            ))}
          </View>
        )}
        {count > 4 ? (
          <View style={styles.more}>
            <Text style={styles.moreText}>+{count - 4}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text style={[styles.kicker, { color: colors.textSecondary }]}>
          {t('photos:dayStack.title')}
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('photos:dayStack.count', { count })}
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
          {[time, fieldNames.join(' · ')].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  collage: {
    width: 112,
    height: 112,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: '#1f2a1c',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    height: '50%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(20, 28, 18, 0.78)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  moreText: {
    color: '#f4f7f2',
    fontSize: 11,
    fontWeight: '700',
  },
  meta: {
    flex: 1,
    justifyContent: 'center',
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
  sub: {
    ...typography.styles.caption,
  },
});

export default ChronologioPhotoStackCard;
