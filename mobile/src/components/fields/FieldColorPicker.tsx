import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { FIELD_COLOR_PRESETS, resolveFieldColor } from '../../utils/fieldColors';
import { spacing } from '../../theme';

type Props = {
  value?: string | null;
  fieldId?: string | null;
  onChange: (color: string) => void;
  disabled?: boolean;
};

const FieldColorPicker: React.FC<Props> = ({ value, fieldId, onChange, disabled }) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const selected = resolveFieldColor(value, fieldId);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {t('form.color', { defaultValue: 'Field color' })}
      </Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {t('form.colorHint', {
          defaultValue: 'Used on Chronologio cards so you can spot this grove quickly.',
        })}
      </Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {FIELD_COLOR_PRESETS.map((color) => {
          const active = selected.toUpperCase() === color.toUpperCase();
          return (
            <Pressable
              key={color}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: Boolean(disabled) }}
              disabled={disabled}
              onPress={() => onChange(color)}
              style={[
                styles.swatch,
                {
                  backgroundColor: color,
                  borderColor: active ? colors.textPrimary : 'transparent',
                  minWidth: Math.max(tapMin * 0.7, 36),
                  minHeight: Math.max(tapMin * 0.7, 36),
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm, marginBottom: spacing.sm, gap: 6 },
  label: { fontWeight: '700', fontSize: 14 },
  hint: { fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  swatch: {
    borderRadius: 999,
    borderWidth: 3,
  },
});

export default FieldColorPicker;
