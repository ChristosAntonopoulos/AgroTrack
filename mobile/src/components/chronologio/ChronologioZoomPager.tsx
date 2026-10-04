import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  /** 0 = Days, 1 = Months, 2 = Years */
  index: number;
  onIndexChange: (index: number) => void;
  /** Exactly three page nodes: Days, Months, Years */
  pages: [React.ReactNode, React.ReactNode, React.ReactNode];
};

/**
 * Horizontal zoom ladder — swipe between Days ↔ Months ↔ Years.
 */
const ChronologioZoomPager: React.FC<Props> = ({ index, onIndexChange, pages }) => {
  const scrollRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(Dimensions.get('window').width);
  const fromUserSwipe = useRef(false);
  const indexRef = useRef(index);
  indexRef.current = index;

  const scrollToIndex = useCallback(
    (i: number, animated: boolean) => {
      if (pageWidth <= 0) return;
      scrollRef.current?.scrollTo({ x: Math.max(0, i) * pageWidth, y: 0, animated });
    },
    [pageWidth]
  );

  // Layout / external tab changes → snap pager (skip if we just reported a swipe)
  useEffect(() => {
    if (pageWidth <= 0) return;
    if (fromUserSwipe.current) {
      fromUserSwipe.current = false;
      return;
    }
    const id = requestAnimationFrame(() => scrollToIndex(index, false));
    return () => cancelAnimationFrame(id);
  }, [index, pageWidth, scrollToIndex]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth <= 0) return;
    const page = Math.max(
      0,
      Math.min(pages.length - 1, Math.round(e.nativeEvent.contentOffset.x / pageWidth))
    );
    if (page === indexRef.current) return;
    fromUserSwipe.current = true;
    onIndexChange(page);
  };

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - pageWidth) > 1) {
          setPageWidth(w);
        }
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
        style={styles.wrap}
      >
        {pages.map((page, i) => (
          <View key={i} style={[styles.page, { width: pageWidth || 1 }]} collapsable={false}>
            {page}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  page: { flex: 1 },
});

export default ChronologioZoomPager;
