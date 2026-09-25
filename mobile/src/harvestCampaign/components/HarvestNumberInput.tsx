import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, typography } from '../../theme';
import { clampMin, parseHarvestDecimal } from '../utils/harvestValidation';

export type HarvestNumberInputProps = {
  label: string;
  value: string;
  onChange: (raw: string) => void;
  onCommit?: (parsed: number | null) => void;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  autoFocus?: boolean;
  error?: string | null;
  disabled?: boolean;
};

export const HarvestNumberInput: React.FC<HarvestNumberInputProps> = ({
  label,
  value,
  onChange,
  onCommit,
  suffix,
  placeholder = '0',
  min,
  max,
  autoFocus,
  error,
  disabled,
}) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const commit = () => {
    let parsed = parseHarvestDecimal(value);
    if (parsed != null && min != null) parsed = clampMin(parsed, min);
    if (parsed != null && max != null) parsed = Math.min(max, parsed);
    onCommit?.(parsed);
  };

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: error
              ? 'rgba(196, 68, 68, 0.12)'
              : colors.eventHarvestSoft,
            shadowColor: error ? colors.error : colors.eventHarvest,
            shadowOpacity: focused ? 0.22 : 0,
            shadowRadius: focused ? 6 : 0,
            shadowOffset: { width: 0, height: 0 },
            elevation: focused ? 2 : 0,
            borderWidth: focused ? 2 : 0,
            borderColor: error
              ? colors.error
              : focused
                ? colors.eventHarvest
                : 'transparent',
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          autoFocus={autoFocus}
          editable={!disabled}
          accessibilityLabel={label}
          accessibilityState={{ disabled: Boolean(disabled) }}
          style={[styles.input, { color: colors.textPrimary }]}
        />
        {suffix ? (
          <Text style={[styles.suffix, { color: colors.textSecondary }]}>{suffix}</Text>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: {
    ...typography.styles.bodySmall,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  inputRow: {
    minHeight: 72,
    borderRadius: radii.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  suffix: { paddingLeft: spacing.xs, fontSize: 20, fontWeight: '700' },
  error: { ...typography.styles.caption },
});
