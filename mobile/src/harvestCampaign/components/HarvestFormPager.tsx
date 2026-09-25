import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/ui/Button';
import { radii, spacing } from '../../theme';

type Props = {
  current: number;
  total: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
  nextLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
  backLabel?: string;
  onBack?: () => void;
  cancelLabel: string;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
};

export const HarvestFormPager: React.FC<Props> = ({
  current,
  total,
  title,
  hint,
  children,
  nextLabel,
  onNext,
  nextDisabled,
  backLabel,
  onBack,
  cancelLabel,
  onCancel,
  busy,
  error,
}) => {
  const { colors } = useTheme();
  const index = Math.min(Math.max(current, 0), Math.max(total - 1, 0));

  return (
    <View style={styles.shell}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {total > 1 ? (
          <View style={styles.progress} accessibilityRole="progressbar">
            {Array.from({ length: total }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i <= index ? colors.eventHarvest : colors.borderLight,
                    flex: i === index ? 1.6 : 1,
                  },
                ]}
              />
            ))}
          </View>
        ) : null}
        {total > 1 ? (
          <Text style={[styles.kicker, { color: colors.textTertiary }]}>
            {index + 1} / {total}
          </Text>
        ) : null}
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {hint ? <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text> : null}
        <View style={styles.body}>{children}</View>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: colors.borderLight, backgroundColor: colors.surface }]}>
        {error ? (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        ) : null}
        <Button title={nextLabel} disabled={nextDisabled || busy} onPress={onNext} fullWidth size="large" />
        {onBack ? (
          <Button title={backLabel || ''} variant="outline" disabled={busy} onPress={onBack} fullWidth />
        ) : null}
        <Pressable
          onPress={onCancel}
          disabled={busy}
          accessibilityRole="button"
          style={styles.cancelHit}
        >
          <Text style={[styles.cancel, { color: colors.textSecondary }]}>{cancelLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
};

export const HarvestHint: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  return <Text style={[styles.hint, { color: colors.textSecondary }]}>{children}</Text>;
};

export const HarvestMoreToggle: React.FC<{ open: boolean; onPress: () => void; openLabel: string; closedLabel: string }> = ({
  open,
  onPress,
  openLabel,
  closedLabel,
}) => {
  const { colors, tapMin } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.more, { minHeight: Math.max(44, tapMin * 0.8) }]}
    >
      <Text style={{ color: colors.eventHarvest, fontWeight: '700' }}>{open ? openLabel : closedLabel}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.eventHarvest} />
    </Pressable>
  );
};

export const HarvestTextField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}> = ({ label, value, onChange, multiline }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.fieldInput,
          {
            color: colors.textPrimary,
            backgroundColor: colors.eventHarvestSoft,
            minHeight: multiline ? 88 : 52,
          },
        ]}
      />
    </View>
  );
};

export const HarvestQuickChips: React.FC<{
  values: number[];
  onPick: (value: number) => void;
  suffix?: string;
}> = ({ values, onPick, suffix }) => {
  const { colors, tapMin } = useTheme();
  return (
    <View style={styles.chips}>
      {values.map((value) => (
        <Pressable
          key={value}
          onPress={() => onPick(value)}
          style={[
            styles.chip,
            {
              minHeight: Math.max(40, tapMin * 0.8),
              borderColor: colors.eventHarvest,
              backgroundColor: colors.eventHarvestSoft,
            },
          ]}
        >
          <Text style={{ color: colors.eventHarvest, fontWeight: '800', letterSpacing: -0.2 }}>
            +{value}
            {suffix ? ` ${suffix}` : ''}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 280 },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { gap: spacing.md, paddingBottom: spacing.md },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  dot: { height: 6, borderRadius: radii.full },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  title: { fontWeight: '700', fontSize: 26, letterSpacing: -0.5, lineHeight: 32 },
  hint: { fontSize: 15, lineHeight: 22, marginTop: -4 },
  body: { gap: spacing.lg },
  footer: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  error: { textAlign: 'center', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  cancelHit: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  cancel: { fontSize: 14, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  field: { gap: spacing.xs },
  fieldLabel: {
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  fieldInput: {
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
    textAlignVertical: 'top',
  },
});
