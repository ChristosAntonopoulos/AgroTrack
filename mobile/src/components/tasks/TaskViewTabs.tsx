import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, radii } from '../../theme';
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
            style={[
              styles.tab,
              {
                minHeight: Math.max(44, tapMin * 0.9),
                backgroundColor: selected ? colors.primaryLight : 'transparent',
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? colors.primary : colors.textSecondary,
                  fontSize: 13 * fontScaleMultiplier,
                  fontWeight: selected ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {view.label}
            </Text>
            {view.count > 0 ? (
              <View
                style={[
                  styles.count,
                  { backgroundColor: selected ? colors.primary : colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    { color: selected ? colors.onOlive : colors.textSecondary },
                  ]}
                >
                  {view.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 11,
    paddingHorizontal: spacing.xs,
  },
  label: {
    ...typography.styles.caption,
  },
  count: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

export default TaskViewTabs;
