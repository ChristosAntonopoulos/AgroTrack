import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, typography } from '../../theme';
import { clampMin, parseHarvestDecimal } from '../utils/harvestValidation';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  suffix: string;
  label: string;
};

export const HarvestNumberStepper: React.FC<Props> = ({
  value,
  onChange,
  min = 0,
  step = 1,
  suffix,
  label,
}) => {
  const { colors, tapMin } = useTheme();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const setCommitted = (next: number) => {
    const safe = clampMin(next, min);
    onChange(safe);
    setDraft(String(safe));
  };
  const commitDraft = () => {
    if (!draft.trim()) return setCommitted(min);
    const parsed = parseHarvestDecimal(draft);
    if (parsed == null) setDraft(String(value));
    else setCommitted(parsed);
  };

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.row, { backgroundColor: colors.eventHarvestSoft }]}>
        <Pressable
          onPress={() => setCommitted(value - step)}
          accessibilityRole="button"
          accessibilityLabel="-"
          style={[
            styles.button,
            {
              minWidth: Math.max(52, tapMin),
              minHeight: Math.max(52, tapMin),
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Text style={styles.buttonText}>−</Text>
        </Pressable>
        <View style={styles.value}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commitDraft}
            keyboardType="decimal-pad"
            accessibilityLabel={label}
            style={[styles.input, { color: colors.textPrimary }]}
          />
          <Text style={[styles.suffix, { color: colors.textSecondary }]}>{suffix}</Text>
        </View>
        <Pressable
          onPress={() => setCommitted(value + step)}
          accessibilityRole="button"
          accessibilityLabel="+"
          style={[
            styles.button,
            {
              minWidth: Math.max(52, tapMin),
              minHeight: Math.max(52, tapMin),
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
};

export const NumberStepper = HarvestNumberStepper;

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: { ...typography.styles.bodySmall, fontWeight: '700', fontSize: 15 },
  row: {
    borderWidth: 0,
    borderRadius: radii.xl,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    padding: 6,
    gap: 6,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
  },
  buttonText: { fontSize: 28, fontWeight: '800', color: '#fffaf0' },
  value: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  input: {
    minWidth: 72,
    paddingVertical: spacing.sm,
    textAlign: 'right',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  suffix: { fontSize: 18, fontWeight: '750' as '700' },
});
