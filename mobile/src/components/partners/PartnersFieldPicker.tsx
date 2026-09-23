import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Field } from '../../services/fieldService';
import { isListedGrove } from '../../utils/fieldDisplay';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { spacing, radii } from '../../theme';

type Props = {
  fields: Field[];
  value: string;
  onChange: (fieldId: string) => void;
  counts?: Record<string, number>;
};

const PartnersFieldPicker: React.FC<Props> = ({ fields, value, onChange, counts = {} }) => {
  const { t } = useTranslation('partners');
  const { colors } = useTheme();
  const options = fields.filter(isListedGrove);
  const selected = options.find((field) => field.id === value);

  const chip = (id: string, label: string, count: number | undefined, active: boolean, color?: string) => (
    <Pressable
      key={id || 'all'}
      onPress={() => onChange(id)}
      style={[
        styles.chip,
        {
          borderColor: active ? colors.oliveBorder : colors.border,
          backgroundColor: active ? colors.primaryLight : colors.surface,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.swatch, { backgroundColor: color || colors.oliveBorder }]} />
      <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{label}</Text>
      {typeof count === 'number' ? (
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('peopleOnField', { count })}</Text>
      ) : null}
    </Pressable>
  );

  const allCount = options.reduce((sum, field) => sum + (counts[field.id] || 0), 0);

  if (options.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textTertiary }]}>{t('fieldScope')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {chip('', t('allFields'), allCount, !value, colors.oliveBorder)}
        {options.map((field) =>
          chip(
            field.id,
            friendlyFieldLabel(field.name),
            counts[field.id],
            value === field.id,
            field.color
          )
        )}
      </ScrollView>
      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6 }}>
        {selected ? t('fieldScopeOneHint') : t('fieldScopeAllHint')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: { gap: 8, paddingRight: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  swatch: { width: 10, height: 10, borderRadius: 5 },
});

export default PartnersFieldPicker;
