import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, createElevation, motion } from '../../theme';
import type { TaskPageView } from '../../utils/taskViewState';

export type TaskViewTabItem = {
  id: TaskPageView;
  label: string;
  count: number;
};

const TaskViewTabs = ({
  views,
  activeView,
  onChange,
}: {
  views: TaskViewTabItem[];
  activeView: TaskPageView;
  onChange: (view: TaskPageView) => void;
}) => {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight },
      ]}
      accessibilityRole="tablist"
    >
      {views.map((view) => {
        const selected = view.id === activeView;
        return (
          <Pressable
            key={view.id}
            onPress={() => onChange(view.id)}
            style={({ pressed }) => [
              styles.tab,
              {
                minHeight: Math.max(46, tapMin * 0.92),
                backgroundColor: selected ? colors.surface : 'transparent',
                opacity: pressed ? motion.pressOpacity : 1,
                ...(selected ? createElevation(colors, 'sm') : {}),
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text
              style={{
                color: selected ? colors.textPrimary : colors.textSecondary,
                fontSize: 15 * fontScaleMultiplier,
                fontWeight: selected ? '700' : '600',
              }}
              numberOfLines={1}
            >
              {view.label}
            </Text>
            <View
              style={[
                styles.count,
                {
                  backgroundColor: selected ? colors.primaryLight : colors.surface,
                  borderColor: selected ? colors.oliveBorder : colors.borderLight,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? colors.primary : colors.textSecondary,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {view.count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
  },
  count: {
    minWidth: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default TaskViewTabs;
