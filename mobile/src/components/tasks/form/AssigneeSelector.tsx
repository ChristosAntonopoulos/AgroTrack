import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { radii, spacing } from '../../../theme';
import { TaskChoiceChips, TaskHelpText } from '../TaskChoiceChips';

export type AssigneeOption = {
  key: string;
  label: string;
  hint?: string;
  group?: 'self' | 'partner' | 'family' | 'contact' | 'later';
};

const AssigneeSelector = ({
  options,
  value,
  onChange,
}: {
  options: AssigneeOption[];
  value: string;
  onChange: (key: string) => void;
}) => {
  const { t } = useTranslation('tasks');
  const { colors, tapMin } = useTheme();
  const selfOption = options.find((option) => option.group === 'self') || options[0];
  const selfKey = selfOption?.key || 'later';
  const laterOption = options.find((option) => option.group === 'later' || option.key === 'later');
  const peopleOptions = useMemo(
    () =>
      options.filter(
        (option) => option.key !== selfKey && option.group !== 'later' && option.key !== 'later'
      ),
    [options, selfKey]
  );
  const selectedPerson = peopleOptions.find((option) => option.key === value);
  const [pickingOther, setPickingOther] = useState(Boolean(selectedPerson));
  const showPicker = pickingOther || Boolean(selectedPerson);

  return (
    <View style={styles.wrap}>
      <TaskChoiceChips
        options={[
          { id: selfKey, label: selfOption?.label || t('fieldWork.form.assigneeMe') },
          ...(peopleOptions.length > 0
            ? [{ id: '__other__', label: t('fieldWork.form.assigneeSomeoneElse') }]
            : []),
          ...(laterOption ? [{ id: laterOption.key, label: laterOption.label }] : []),
        ]}
        value={showPicker ? '__other__' : value}
        onChange={(key) => {
          if (key === '__other__') {
            setPickingOther(true);
            if (!selectedPerson && peopleOptions[0]) onChange(peopleOptions[0].key);
            return;
          }
          setPickingOther(false);
          onChange(key);
        }}
      />
      {showPicker && peopleOptions.length > 0 ? (
        <View style={styles.people}>
          {peopleOptions.map((option) => {
            const selected = option.key === value;
            return (
              <Pressable
                key={option.key}
                onPress={() => onChange(option.key)}
                style={[
                  styles.person,
                  {
                    minHeight: tapMin,
                    borderColor: selected ? colors.oliveBorder : colors.borderLight,
                    backgroundColor: selected ? colors.primaryLight : colors.surface,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{option.label}</Text>
                  {option.hint ? (
                    <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{option.hint}</Text>
                  ) : null}
                </View>
                {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {!showPicker && value === selfKey ? (
        <TaskHelpText>{t('fieldWork.form.assigneeMeHint')}</TaskHelpText>
      ) : null}
      {showPicker && selectedPerson?.key.startsWith('contact:') ? (
        <TaskHelpText>{t('fieldWork.form.assignOutcomeContact')}</TaskHelpText>
      ) : null}
      {showPicker && selectedPerson?.key.startsWith('user:') ? (
        <TaskHelpText>{t('fieldWork.form.assignOutcomeCollaborator')}</TaskHelpText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  people: { gap: spacing.xs },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
});

export default AssigneeSelector;
