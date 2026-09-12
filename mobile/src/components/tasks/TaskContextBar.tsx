import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, radii } from '../../theme';
import Sheet from '../ui/Sheet';
import type { Field } from '../../services/fieldService';

const TaskContextBar = ({
  yearLabel,
  year,
  years,
  defaultYear,
  fieldLabel,
  allFieldsLabel,
  fieldId,
  fields,
  moreFiltersLabel,
  onYearChange,
  onFieldChange,
  clearYearLabel,
  clearFieldLabel,
}: {
  yearLabel: string;
  year: number;
  years: number[];
  defaultYear: number;
  fieldLabel: string;
  allFieldsLabel: string;
  fieldId: string;
  fields: Field[];
  moreFiltersLabel: string;
  onYearChange: (year: number) => void;
  onFieldChange: (fieldId: string) => void;
  clearYearLabel: string;
  clearFieldLabel: string;
}) => {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const [yearOpen, setYearOpen] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const yearChanged = year !== defaultYear;
  const fieldChanged = Boolean(fieldId);
  const selectedField = fields.find((field) => field.id === fieldId);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={() => setFieldOpen(true)}
          style={[
            styles.control,
            {
              borderColor: colors.borderLight,
              backgroundColor: colors.surface,
              minHeight: Math.max(44, tapMin * 0.9),
              flex: 1.4,
            },
          ]}
        >
          <Text style={[styles.controlLabel, { color: colors.textTertiary }]}>{fieldLabel}</Text>
          <Text
            style={[styles.controlValue, { color: colors.textPrimary, fontSize: 14 * fontScaleMultiplier }]}
            numberOfLines={1}
          >
            {selectedField?.name || allFieldsLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
        </Pressable>
        <Pressable
          onPress={() => setMoreOpen(true)}
          style={[
            styles.control,
            {
              borderColor: colors.borderLight,
              backgroundColor: colors.surface,
              minHeight: Math.max(44, tapMin * 0.9),
              flex: 1,
            },
          ]}
        >
          <Text style={[styles.controlLabel, { color: colors.textTertiary }]}>{moreFiltersLabel}</Text>
          <Text
            style={[styles.controlValue, { color: colors.textPrimary, fontSize: 14 * fontScaleMultiplier }]}
            numberOfLines={1}
          >
            {yearChanged ? String(year) : yearLabel}
          </Text>
          <Ionicons name="options-outline" size={16} color={colors.textTertiary} />
        </Pressable>
      </View>

      {yearChanged || fieldChanged ? (
        <View style={styles.chips}>
          {fieldChanged ? (
            <Pressable
              onPress={() => onFieldChange('')}
              style={[styles.filterChip, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}
              accessibilityLabel={clearFieldLabel}
            >
              <Text style={[styles.filterChipText, { color: colors.primary }]} numberOfLines={1}>
                {selectedField?.name || fieldId}
              </Text>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
          {yearChanged ? (
            <Pressable
              onPress={() => onYearChange(defaultYear)}
              style={[styles.filterChip, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}
              accessibilityLabel={clearYearLabel}
            >
              <Text style={[styles.filterChipText, { color: colors.primary }]}>
                {yearLabel}: {year}
              </Text>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Sheet open={fieldOpen} onClose={() => setFieldOpen(false)} title={fieldLabel} edge="bottom" size="md">
        <Pressable
          onPress={() => {
            onFieldChange('');
            setFieldOpen(false);
          }}
          style={[
            styles.sheetRow,
            {
              minHeight: tapMin,
              backgroundColor: !fieldId ? colors.primaryLight : 'transparent',
            },
          ]}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: !fieldId ? '700' : '500' }}>
            {allFieldsLabel}
          </Text>
        </Pressable>
        {fields.map((field) => (
          <Pressable
            key={field.id}
            onPress={() => {
              onFieldChange(field.id);
              setFieldOpen(false);
            }}
            style={[
              styles.sheetRow,
              {
                minHeight: tapMin,
                backgroundColor: field.id === fieldId ? colors.primaryLight : 'transparent',
              },
            ]}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: field.id === fieldId ? '700' : '500' }}>
              {field.name}
            </Text>
            {field.id === fieldId ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
          </Pressable>
        ))}
      </Sheet>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={moreFiltersLabel} edge="bottom" size="sm">
        <Pressable
          onPress={() => {
            setMoreOpen(false);
            setYearOpen(true);
          }}
          style={[styles.sheetRow, { minHeight: tapMin }]}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
            {yearLabel}: {year}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>
      </Sheet>

      <Sheet open={yearOpen} onClose={() => setYearOpen(false)} title={yearLabel} edge="bottom" size="sm">
        {years.map((option) => (
          <Pressable
            key={option}
            onPress={() => {
              onYearChange(option);
              setYearOpen(false);
            }}
            style={[
              styles.sheetRow,
              {
                minHeight: tapMin,
                backgroundColor: option === year ? colors.primaryLight : 'transparent',
              },
            ]}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: option === year ? '700' : '500' }}>
              {option}
            </Text>
            {option === year ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  controlLabel: {
    ...typography.styles.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  controlValue: {
    ...typography.styles.bodySmall,
    fontWeight: '700',
    flex: 1,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  filterChipText: {
    ...typography.styles.caption,
    fontWeight: '700',
    maxWidth: 180,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
});

export default TaskContextBar;
