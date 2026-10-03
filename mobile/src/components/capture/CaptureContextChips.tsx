import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { formatCaptureDateChip, dateInputValueFromOccurredAt } from '../../capture/dateLabel';
import FormDateField from '../forms/FormDateField';
import FieldColorMark from '../fields/FieldColorMark';
import { useTheme } from '../../context/ThemeContext';
import { radii } from '../../theme';

type Props = {
  fields: Field[];
  fieldId: string;
  occurredAt: string;
  recentFieldId?: string;
  onFieldChange: (id: string) => void;
  onOccurredAtChange: (iso: string) => void;
};

const CaptureContextChips: React.FC<Props> = ({
  fields,
  fieldId,
  occurredAt,
  recentFieldId,
  onFieldChange,
  onOccurredAtChange,
}) => {
  const { t, i18n } = useTranslation(['capture']);
  const { colors, tapMin } = useTheme();
  const [fieldOpen, setFieldOpen] = useState(false);
  const selected = fields.find((f) => f.id === fieldId);
  const rawDate = formatCaptureDateChip(occurredAt, i18n.language);
  const dateHint =
    rawDate === 'Σήμερα' || rawDate === 'Today' || rawDate === 'Oggi'
      ? t('capture:today', { defaultValue: rawDate })
      : rawDate;
  const fieldLabel =
    friendlyFieldLabel(selected?.name || fieldId) || t('capture:fieldPrompt');

  const orderedFields = useMemo(() => {
    if (!recentFieldId) return fields;
    const head = fields.filter((f) => f.id === recentFieldId);
    const rest = fields.filter((f) => f.id !== recentFieldId);
    return [...head, ...rest];
  }, [fields, recentFieldId]);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('capture:fieldPrompt')}
        onPress={() => setFieldOpen(true)}
        style={({ pressed }) => [
          styles.chip,
          {
            borderColor: fieldId ? colors.borderLight : colors.oliveBorder,
            backgroundColor: colors.surfaceMuted,
            minHeight: Math.max(40, tapMin - 8),
            opacity: pressed ? 0.9 : 1,
            borderStyle: fieldId ? 'solid' : 'dashed',
          },
        ]}
      >
        {selected ? <FieldColorMark color={selected.color} fieldId={selected.id} size={10} /> : null}
        <Text style={[styles.chipLabel, { color: colors.textPrimary }]} numberOfLines={1}>
          {fieldLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.dateField}>
        <FormDateField
          label={dateHint}
          compact
          value={dateInputValueFromOccurredAt(occurredAt)}
          onValueChange={(ymd) => {
            const [year, month, day] = ymd.split('-').map(Number);
            const current = new Date(occurredAt);
            const next = Number.isNaN(current.getTime()) ? new Date() : new Date(current);
            if (year && month && day) next.setFullYear(year, month - 1, day);
            onOccurredAtChange(next.toISOString());
          }}
        />
      </View>

      <Modal visible={fieldOpen} transparent animationType="fade" onRequestClose={() => setFieldOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFieldOpen(false)}>
          <Pressable
            style={[styles.menu, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.menuPrompt, { color: colors.textTertiary }]}>
              {t('capture:fieldPrompt')}
            </Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {orderedFields.map((f) => {
                const active = f.id === fieldId;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => {
                      onFieldChange(f.id);
                      setFieldOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: active || pressed ? colors.primaryLight : 'transparent',
                        minHeight: tapMin,
                      },
                    ]}
                  >
                    <FieldColorMark color={f.color} fieldId={f.id} size={12} />
                    <Text style={{ color: colors.textPrimary, fontWeight: active ? '800' : '600', flex: 1 }}>
                      {friendlyFieldLabel(f.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: radii.full,
    maxWidth: '100%',
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 160,
  },
  dateField: {
    minWidth: 120,
    flexGrow: 0,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 24, 20, 0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  menu: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  menuPrompt: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
});

export default CaptureContextChips;
