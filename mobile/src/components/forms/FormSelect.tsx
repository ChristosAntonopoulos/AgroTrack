import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

export interface FormSelectProps {
  label: string;
  value?: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const FormSelect: React.FC<FormSelectProps> = ({
  label,
  value,
  options,
  onValueChange,
  placeholder = 'Select…',
  disabled = false,
}) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.borderLight,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.triggerText,
            { color: selectedLabel ? colors.textPrimary : colors.textTertiary },
          ]}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onValueChange(item.value);
                    setOpen(false);
                  }}
                  style={[
                    styles.option,
                    active && { backgroundColor: colors.primary + '14' },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: active ? colors.primary : colors.textPrimary },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  triggerText: { ...typography.styles.body, flex: 1, marginRight: spacing.sm },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '55%',
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  optionText: { ...typography.styles.body },
});

export default FormSelect;
