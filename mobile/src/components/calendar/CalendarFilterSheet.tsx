import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import { Field } from '../../services/fieldService';
import { CalendarFilters } from '../../services/calendarService';
import { typography, spacing } from '../../theme';

interface Props {
  visible: boolean;
  fields: Field[];
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
  onClose: () => void;
}

const STATUS_OPTIONS = ['pending', 'in_progress', 'completed'] as const;

const CalendarFilterSheet: React.FC<Props> = ({
  visible,
  fields,
  filters,
  onChange,
  onClose,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation(['calendar', 'common']);

  const toggleField = (fieldId: string) => {
    const current = filters.fieldIds ?? [];
    const next = current.includes(fieldId)
      ? current.filter(id => id !== fieldId)
      : [...current, fieldId];
    onChange({ ...filters, fieldIds: next.length ? next : undefined });
  };

  const toggleStatus = (status: string) => {
    const current = filters.statuses ?? [];
    const next = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onChange({ ...filters, statuses: next.length ? next : undefined });
  };

  const clear = () => onChange({ showTasks: true, showDeadlines: true });

  return (
    <Sheet
      open={visible}
      onClose={onClose}
      edge="end"
      title={t('calendar:filters')}
      footer={
        <View style={styles.actions}>
          <Button title={t('calendar:clearFilters')} variant="outline" onPress={clear} style={{ flex: 1 }} />
          <Button title={t('common:confirm')} onPress={onClose} style={{ flex: 1 }} />
        </View>
      }
    >
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('calendar:filterField')}</Text>
      {fields.map(f => {
        const active = filters.fieldIds?.includes(f.id);
        return (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.option,
              {
                borderColor: active ? colors.oliveBorder : colors.border,
                backgroundColor: active ? colors.primaryLight : colors.surface,
              },
            ]}
            onPress={() => toggleField(f.id)}
          >
            <Text style={{ color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '600' : '500' }}>
              {f.name}
            </Text>
            <Text style={{ color: active ? colors.primary : colors.textSecondary }}>
              {active ? '✓' : ''}
            </Text>
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.section, { color: colors.textSecondary, marginTop: spacing.md }]}>
        {t('calendar:filterStatus')}
      </Text>
      {STATUS_OPTIONS.map(status => {
        const active = filters.statuses?.includes(status);
        return (
          <TouchableOpacity
            key={status}
            style={[
              styles.option,
              {
                borderColor: active ? colors.oliveBorder : colors.border,
                backgroundColor: active ? colors.primaryLight : colors.surface,
              },
            ]}
            onPress={() => toggleStatus(status)}
          >
            <Text style={{ color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '600' : '500' }}>
              {t(`calendar:status.${status}`)}
            </Text>
            <Text style={{ color: active ? colors.primary : colors.textSecondary }}>
              {active ? '✓' : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  section: { ...typography.styles.caption, fontWeight: '700', marginBottom: spacing.sm },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
});

export default CalendarFilterSheet;
