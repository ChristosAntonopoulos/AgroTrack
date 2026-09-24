import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, radii } from '../../theme';
import Sheet from '../ui/Sheet';
import FieldColorMark from '../fields/FieldColorMark';
import type { Field } from '../../services/fieldService';
import { harvestYearSpan } from '../../finance/harvestYear';

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
  assigneeLabel,
  allAssigneesLabel,
  assigneeId,
  assignees = [],
  onYearChange,
  onFieldChange,
  onAssigneeChange,
  clearYearLabel,
  clearFieldLabel,
  clearAssigneeLabel,
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
  assigneeLabel?: string;
  allAssigneesLabel?: string;
  assigneeId?: string;
  assignees?: Array<{ id: string; name: string }>;
  onYearChange: (year: number) => void;
  onFieldChange: (fieldId: string) => void;
  onAssigneeChange?: (assigneeId: string) => void;
  clearYearLabel: string;
  clearFieldLabel: string;
  clearAssigneeLabel?: string;
}) => {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const [yearOpen, setYearOpen] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const yearChanged = year !== defaultYear;
  const fieldChanged = Boolean(fieldId);
  const assigneeChanged = Boolean(assigneeId);
  const selectedField = fields.find((field) => field.id === fieldId);
  const selectedAssignee = assignees.find((item) => item.id === assigneeId);
  const yearText = harvestYearSpan(year);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={() => setFieldOpen(true)}
          accessibilityLabel={fieldLabel}
          style={[
            styles.control,
            {
              borderColor: fieldChanged ? colors.oliveBorder : colors.borderLight,
              backgroundColor: fieldChanged ? colors.primaryLight : colors.surface,
              minHeight: Math.max(44, tapMin * 0.9),
              flex: 1.4,
            },
          ]}
        >
          <FieldColorMark
            color={selectedField?.color}
            fieldId={selectedField?.id}
            hollow={!selectedField}
            size={12}
          />
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
          accessibilityLabel={moreFiltersLabel}
          style={[
            styles.control,
            {
              borderColor: yearChanged || assigneeChanged ? colors.oliveBorder : colors.borderLight,
              backgroundColor: yearChanged || assigneeChanged ? colors.primaryLight : colors.surface,
              minHeight: Math.max(44, tapMin * 0.9),
              flex: 1,
            },
          ]}
        >
          <Ionicons name="options-outline" size={16} color={yearChanged || assigneeChanged ? colors.primary : colors.textTertiary} />
          <Text
            style={[styles.controlValue, { color: colors.textPrimary, fontSize: 14 * fontScaleMultiplier }]}
            numberOfLines={1}
          >
            {yearChanged ? yearText : moreFiltersLabel}
          </Text>
        </Pressable>
      </View>

      {yearChanged || fieldChanged || assigneeChanged ? (
        <View style={styles.chips}>
          {fieldChanged ? (
            <Pressable
              onPress={() => onFieldChange('')}
              style={[styles.filterChip, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}
              accessibilityLabel={clearFieldLabel}
            >
              <FieldColorMark color={selectedField?.color} fieldId={selectedField?.id || fieldId} size={8} />
              <Text style={[styles.filterChipText, { color: colors.primary }]} numberOfLines={1}>
                {selectedField?.name || fieldId}
              </Text>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
          {assigneeChanged ? (
            <Pressable
              onPress={() => onAssigneeChange?.('')}
              style={[styles.filterChip, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}
              accessibilityLabel={clearAssigneeLabel}
            >
              <Text style={[styles.filterChipText, { color: colors.primary }]} numberOfLines={1}>
                {selectedAssignee?.name || assigneeId}
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
                {yearLabel}: {yearText}
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
          <View style={styles.sheetLabel}>
            <FieldColorMark hollow size={12} />
            <Text style={{ color: colors.textPrimary, fontWeight: !fieldId ? '700' : '500' }}>
              {allFieldsLabel}
            </Text>
          </View>
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
            <View style={styles.sheetLabel}>
              <FieldColorMark color={field.color} fieldId={field.id} size={12} />
              <Text style={{ color: colors.textPrimary, fontWeight: field.id === fieldId ? '700' : '500' }}>
                {field.name}
              </Text>
            </View>
            {field.id === fieldId ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
          </Pressable>
        ))}
      </Sheet>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={moreFiltersLabel} edge="bottom" size="sm">
        {onAssigneeChange ? (
          <Pressable
            onPress={() => {
              setMoreOpen(false);
              setAssigneeOpen(true);
            }}
            style={[styles.sheetRow, { minHeight: tapMin }]}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
              {assigneeLabel}: {selectedAssignee?.name || allAssigneesLabel}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            setMoreOpen(false);
            setYearOpen(true);
          }}
          style={[styles.sheetRow, { minHeight: tapMin }]}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
            {yearLabel}: {yearText}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>
      </Sheet>

      <Sheet open={assigneeOpen} onClose={() => setAssigneeOpen(false)} title={assigneeLabel} edge="bottom" size="md">
        <Pressable
          onPress={() => {
            onAssigneeChange?.('');
            setAssigneeOpen(false);
          }}
          style={[
            styles.sheetRow,
            {
              minHeight: tapMin,
              backgroundColor: !assigneeId ? colors.primaryLight : 'transparent',
            },
          ]}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: !assigneeId ? '700' : '500' }}>
            {allAssigneesLabel}
          </Text>
        </Pressable>
        {assignees.map((person) => (
          <Pressable
            key={person.id}
            onPress={() => {
              onAssigneeChange?.(person.id);
              setAssigneeOpen(false);
            }}
            style={[
              styles.sheetRow,
              {
                minHeight: tapMin,
                backgroundColor: person.id === assigneeId ? colors.primaryLight : 'transparent',
              },
            ]}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: person.id === assigneeId ? '700' : '500' }}>
              {person.name}
            </Text>
            {person.id === assigneeId ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
          </Pressable>
        ))}
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
              {harvestYearSpan(option)}
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
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
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
    gap: spacing.sm,
  },
  sheetLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
});

export default TaskContextBar;
