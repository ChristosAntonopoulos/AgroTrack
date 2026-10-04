import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type PhotoViewerItem = {
  id: string;
  uri: string;
  alt?: string;
};

type Props = {
  open: boolean;
  items: PhotoViewerItem[];
  index: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  onOpenDetails?: (index: number) => void;
};

/** Shared fullscreen photo pager for Photo Hub and Chronologio. */
const PhotoViewer: React.FC<Props> = ({
  open,
  items,
  index,
  onClose,
  onIndexChange,
  onOpenDetails,
}) => {
  const { t } = useTranslation('photos');
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<PhotoViewerItem>>(null);
  const [active, setActive] = useState(index);

  useEffect(() => {
    if (!open) return;
    setActive(index);
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [index, open]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
      if (next === active) return;
      setActive(next);
      onIndexChange?.(next);
    },
    [active, onIndexChange, width]
  );

  if (!open || items.length === 0) return null;

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.chrome}>
          <Text style={styles.counter}>
            {t('viewer.counter', { current: active + 1, total: items.length })}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('viewer.close')}
            hitSlop={12}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={24} color="#f4f7f2" />
          </Pressable>
        </View>
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={onMomentumEnd}
          onScrollToIndexFailed={({ index: failed }) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: failed, animated: false });
            }, 50);
          }}
          renderItem={({ item }) => (
            <View style={{ width, height: height * 0.82, justifyContent: 'center' }}>
              <Image
                source={{ uri: item.uri }}
                style={styles.image}
                resizeMode="contain"
                accessibilityLabel={item.alt || t('detail.title')}
              />
            </View>
          )}
        />
        {onOpenDetails ? (
          <Pressable
            onPress={() => onOpenDetails(active)}
            accessibilityRole="button"
            accessibilityLabel={t('viewer.openDetails')}
            style={[styles.detailsBtn, { bottom: Math.max(insets.bottom, 12) + 8 }]}
          >
            <Text style={styles.detailsText}>{t('viewer.openDetails')}</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(12, 18, 12, 0.96)',
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  counter: {
    color: '#f4f7f2',
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28, 38, 26, 0.72)',
  },
  detailsBtn: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -70 }],
    minWidth: 140,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16,
  },
  detailsText: {
    color: '#142016',
    fontWeight: '700',
    fontSize: 15,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default PhotoViewer;
