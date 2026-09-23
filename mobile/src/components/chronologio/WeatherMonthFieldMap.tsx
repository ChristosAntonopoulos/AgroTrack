import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { geospatialService, type FieldMapData } from '../../services/geospatialService';
import type { ChronologioWeatherScene } from '../../services/chronologioService';

type Props = {
  fieldId: string;
  opening?: ChronologioWeatherScene;
  closing?: ChronologioWeatherScene;
};

type SceneImage = { url: string; date?: string };

const layerOf = (data?: FieldMapData | null) =>
  data?.layers.find((layer) => layer.available && layer.imageUrl);

const sceneFallback = (scene?: ChronologioWeatherScene): SceneImage | undefined => {
  const url = scene?.ndviUrl || scene?.trueColorUrl;
  if (!url) return undefined;
  return { url, date: scene?.observationDate };
};

const WeatherMonthFieldMap: React.FC<Props> = ({ fieldId, opening, closing }) => {
  const { t, i18n } = useTranslation(['chronologio']);
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [startData, setStartData] = useState<FieldMapData | null>(null);
  const [endData, setEndData] = useState<FieldMapData | null>(null);
  const [width, setWidth] = useState(0);
  const [split, setSplit] = useState(0.5);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [start, end] = await Promise.all([
          opening?.observationId
            ? geospatialService.getMapData(fieldId, ['ndvi'], opening.observationId)
            : Promise.resolve(null),
          closing?.observationId
            ? geospatialService.getMapData(fieldId, ['ndvi'], closing.observationId)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setStartData(start);
        setEndData(end);
      } catch {
        if (!cancelled) {
          setStartData(null);
          setEndData(null);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [closing?.observationId, fieldId, opening?.observationId]);

  const left = useMemo((): SceneImage | undefined => {
    const layer = layerOf(startData) || layerOf(endData);
    if (layer?.imageUrl) {
      return { url: layer.imageUrl, date: opening?.observationDate || startData?.observationDate };
    }
    return sceneFallback(opening) || sceneFallback(closing);
  }, [closing, endData, opening, startData]);

  const right = useMemo((): SceneImage | undefined => {
    const startLayer = layerOf(startData);
    const endLayer = layerOf(endData);
    if (startLayer?.imageUrl && endLayer?.imageUrl && startLayer.imageUrl !== endLayer.imageUrl) {
      return { url: endLayer.imageUrl, date: closing?.observationDate || endData?.observationDate };
    }
    const startUrl = sceneFallback(opening);
    const endUrl = sceneFallback(closing);
    if (startUrl && endUrl && startUrl.url !== endUrl.url) return endUrl;
    return undefined;
  }, [closing, endData, opening, startData]);

  const formatDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
      : undefined;

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (!width) return;
          const next = Math.min(0.92, Math.max(0.08, evt.nativeEvent.locationX / width));
          setSplit(next);
        },
        onPanResponderMove: (evt) => {
          if (!width) return;
          const next = Math.min(0.92, Math.max(0.08, evt.nativeEvent.locationX / width));
          setSplit(next);
        },
      }),
    [width]
  );

  const openMap = () => {
    navigation.navigate('FieldDetail', { fieldId, mode: 'map' });
  };

  if (!left && !right) {
    return (
      <View style={styles.footerOnly} onStartShouldSetResponder={() => true}>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          {t('chronologio:weatherReview.mapHint')}
        </Text>
        <Pressable
          onPress={openMap}
          style={({ pressed }) => [styles.openBtn, { opacity: pressed ? 0.82 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={[styles.openText, { color: colors.primary }]}>
            {t('chronologio:weatherReview.openMap')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const compare = Boolean(left && right);
  const clipWidth = compare ? Math.round(width * split) : width;

  return (
    <View style={styles.wrap} onStartShouldSetResponder={() => true}>
      <View
        style={[styles.frame, { backgroundColor: colors.surfaceMuted }]}
        onLayout={onLayout}
        {...(compare ? pan.panHandlers : {})}
      >
        {right ? (
          <Image source={{ uri: right.url }} style={styles.image} resizeMode="cover" />
        ) : left ? (
          <Image source={{ uri: left.url }} style={styles.image} resizeMode="cover" />
        ) : null}
        {compare && left && width > 0 ? (
          <View style={[styles.clip, { width: clipWidth }]} pointerEvents="none">
            <Image
              source={{ uri: left.url }}
              style={[styles.image, { width, height: 180 }]}
              resizeMode="cover"
            />
          </View>
        ) : null}
        {compare ? (
          <View style={[styles.handleHit, { left: clipWidth - 18 }]} pointerEvents="none">
            <View style={[styles.handle, { backgroundColor: colors.surface, borderColor: colors.primary }]} />
          </View>
        ) : null}
        {left?.date || right?.date ? (
          <View style={styles.labels} pointerEvents="none">
            {left?.date ? (
              <Text style={[styles.label, { color: colors.surface, backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                {formatDate(left.date)}
              </Text>
            ) : (
              <View />
            )}
            {right?.date ? (
              <Text style={[styles.label, { color: colors.surface, backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                {formatDate(right.date)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        {t('chronologio:weatherReview.mapHint')}
      </Text>
      <Pressable
        onPress={openMap}
        style={({ pressed }) => [styles.openBtn, { opacity: pressed ? 0.82 : 1 }]}
        accessibilityRole="button"
      >
        <Text style={[styles.openText, { color: colors.primary }]}>
          {t('chronologio:weatherReview.openMap')}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  footerOnly: { gap: 6, paddingTop: 4 },
  frame: {
    height: 180,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: 180,
  },
  clip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  handleHit: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  handle: {
    width: 4,
    height: '72%',
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  labels: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  hint: { fontSize: 12, lineHeight: 16 },
  openBtn: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  openText: { fontSize: 13, fontWeight: '700' },
});

export default WeatherMonthFieldMap;
