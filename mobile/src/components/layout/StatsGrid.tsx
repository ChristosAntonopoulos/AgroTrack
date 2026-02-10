import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../theme';

export interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3;
}

const StatsGrid: React.FC<StatsGridProps> = ({ children, columns = 2 }) => {
  const childrenArray = React.Children.toArray(children);

  if (__DEV__) {
    console.log('[StatsGrid] Rendering - columns:', columns, 'children count:', childrenArray.length);
  }

  return (
    <View style={styles.container}>
      {childrenArray.map((child, index) => (
        <View
          key={index}
          style={[
            styles.item,
            {
              width: `${100 / columns - (spacing.sm * (columns - 1)) / columns}%`,
            },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  item: {
    margin: spacing.sm,
  },
});

export default StatsGrid;
