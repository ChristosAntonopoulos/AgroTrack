import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format, isValid, parseISO } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

export interface FormDateFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  placeholder?: string;
}

const toStorageDate = (date: Date) => format(date, 'yyyy-MM-dd');

const parseStorageDate = (value: string): Date => {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date();
};

const FormDateField: React.FC<FormDateFieldProps> = ({
  label,
  value,
  onValueChange,
  minimumDate,
  maximumDate,
  disabled = false,
  placeholder,
}) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseStorageDate(value));

  const locale = i18n.language === 'el' ? el : enUS;
  const parsedValue = useMemo(() => parseStorageDate(value), [value]);

  const displayText = value
    ? format(parsedValue, 'EEE, d MMM yyyy', { locale })
    : placeholder ?? t('selectDate');

  const openPicker = () => {
    if (disabled) return;
    setDraft(parsedValue);
    setOpen(true);
  };

  const commitDate = (date: Date) => {
    onValueChange(toStorageDate(date));
    setOpen(false);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onValueChange(toStorageDate(selected));
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={openPicker}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.borderLight,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text
          style={[
            styles.triggerText,
            { color: value ? colors.textPrimary : colors.textTertiary },
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              locale={i18n.language}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(_, selected) => {
                if (selected) setDraft(selected);
              }}
              style={styles.iosPicker}
            />
            <TouchableOpacity
              onPress={() => commitDate(draft)}
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.doneBtnText, { color: colors.onOlive }]}>
                {t('confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.base },
  label: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  triggerText: { ...typography.styles.body, flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  sheetTitle: { ...typography.styles.body, fontWeight: '700' },
  iosPicker: { height: 220 },
  doneBtn: {
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  doneBtnText: { ...typography.styles.body, fontWeight: '700' },
});

export default FormDateField;
