import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getPhotoService } from '../../services/serviceFactory';
import type { Photo } from '../../services/photoService';
import { resolvePublicAssetUrl } from '../../config/env';
import { useTheme } from '../../context/ThemeContext';
import type { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';

type Props = {
  fieldId: string;
};

/** Overview photo strip — mirrors web FieldPhotosStrip. */
const FieldPhotosStrip: React.FC<Props> = ({ fieldId }) => {
  const { t } = useTranslation(['fields', 'photos']);
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getPhotoService()
      .query({ fieldId, page: 1, pageSize: 8 })
      .then((list) => {
        if (!cancelled) setPhotos(list.items);
      })
      .catch(() => {
        if (!cancelled) setPhotos([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  const openHub = () => navigation.navigate('Photos', { fieldId });

  return (
    <View style={styles.wrap} accessibilityLabel={t('fields:controlRoom.latestPhotos')}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('fields:controlRoom.latestPhotos')}
        </Text>
        <Pressable onPress={openHub} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
            {t('photos:openHub', { defaultValue: 'Open Photo Hub' })}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {t('fields:card.todayTasksLoading', { defaultValue: 'Loading…' })}
        </Text>
      ) : photos.length === 0 ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {t('fields:controlRoom.noPhotos')}
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {photos.map((photo) => {
            const src =
              resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) ||
              photo.thumbnailUrl ||
              photo.url;
            return (
              <Pressable key={photo.id} onPress={openHub} style={styles.thumbWrap}>
                <Image source={{ uri: src }} style={styles.thumb} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    gap: 8,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
});

export default FieldPhotosStrip;
