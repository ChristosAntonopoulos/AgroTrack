import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        {error ? <Text style={{ color: colors.error, textAlign: 'center' }}>{error}</Text> : null}
        <Button title={nextLabel} disabled={nextDisabled || busy} onPress={onNext} fullWidth />
        {onBack ? (
          <Button title={backLabel || ''} variant="ghost" disabled={busy} onPress={onBack} fullWidth />
        ) : null}
        <Button title={cancelLabel} variant="ghost" disabled={busy} onPress={onCancel} fullWidth />
      </View>
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
              borderColor: colors.borderLight,
              backgroundColor: colors.surfaceMuted,
            },
          ]}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
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
  title: { fontWeight: '700', fontSize: 20, letterSpacing: -0.3, lineHeight: 26 },
  hint: { fontSize: 14, lineHeight: 20 },
  body: { gap: spacing.md },
  footer: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
});
