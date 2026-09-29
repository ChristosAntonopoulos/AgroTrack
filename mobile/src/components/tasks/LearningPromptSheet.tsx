import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { hexToRgba } from '../../utils/hexToRgba';
import { radii, spacing } from '../../theme';

export type LearningAction = {
  id: string;
  label: string;
  hint?: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'caution';
};

const LearningPromptSheet = ({
  open,
  title,
  message,
  busy,
  actions,
  onClose,
  onAction,
}: {
  open: boolean;
  title: string;
  message: string;
  busy?: boolean;
  actions: LearningAction[];
  onClose: () => void;
  onAction: (id: string) => void;
}) => {
  const { colors, tapMin } = useTheme();

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={message} edge="bottom" size="md">
      <View style={{ gap: spacing.sm }}>
        {actions.map((action) => {
          const caution = action.variant === 'caution';
          return (
            <Pressable
              key={action.id}
              disabled={busy}
              onPress={() => onAction(action.id)}
              style={[
                styles.row,
                {
                  minHeight: Math.max(56, tapMin),
                  borderColor: caution ? hexToRgba(colors.warning, 0.4) : colors.borderLight,
                  backgroundColor: colors.surface,
                  opacity: busy ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.label, { color: caution ? colors.warning : colors.textPrimary }]}>
                {action.label}
              </Text>
              {action.hint ? (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>{action.hint}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  label: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 18 },
});

export default LearningPromptSheet;
