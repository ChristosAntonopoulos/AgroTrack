import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.white }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('calendar:filters')}</Text>
          <ScrollView style={styles.scroll}>
            <Text style={[styles.section, { color: colors.textSecondary }]}>{t('calendar:filterField')}</Text>
            {fields.map(f => {
              const active = filters.fieldIds?.includes(f.id);
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.option, { borderColor: colors.border }]}
                  onPress={() => toggleField(f.id)}
                >
                  <Text style={{ color: colors.textPrimary }}>{f.name}</Text>
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
                  style={[styles.option, { borderColor: colors.border }]}
                  onPress={() => toggleStatus(status)}
                >
                  <Text style={{ color: colors.textPrimary }}>{t(`calendar:status.${status}`)}</Text>
                  <Text style={{ color: active ? colors.primary : colors.textSecondary }}>
                    {active ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.actions}>
            <Button title={t('calendar:clearFilters')} variant="outline" onPress={clear} />
            <Button title={t('common:confirm')} onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.base,
  },
  title: { ...typography.styles.h3, fontWeight: '700', marginBottom: spacing.md },
  scroll: { maxHeight: 360 },
  section: { ...typography.styles.caption, fontWeight: '700', marginBottom: spacing.sm },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});

export default CalendarFilterSheet;
