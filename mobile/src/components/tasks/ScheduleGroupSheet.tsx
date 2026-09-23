import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import FormDateField from '../forms/FormDateField';
import { useTheme } from '../../context/ThemeContext';
import type { ProposalTemplateGroup } from '../../utils/proposalPresentation';
import { toDateInputValue } from '../../utils/proposalPresentation';
import { spacing } from '../../theme';

type Props = {
  group: ProposalTemplateGroup | null;
  fieldNames: Record<string, string>;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    proposalIds: string[];
    datesByProposalId: Record<string, string>;
  }) => void;
};

const ScheduleGroupSheet: React.FC<Props> = ({
  group,
  fieldNames,
  open,
  busy,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation('tasks');
  const { colors, tapMin } = useTheme();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [dates, setDates] = useState<Record<string, string>>({});
  const [perFieldDates, setPerFieldDates] = useState(false);

  useEffect(() => {
    if (!group) return;
    const nextSelected: Record<string, boolean> = {};
    const nextDates: Record<string, string> = {};
    const shared =
      toDateInputValue(group.recommendedWindowStart) ||
      toDateInputValue(group.proposals[0]?.recommendedWindowStart) ||
      '';
    group.proposals.forEach((proposal) => {
      nextSelected[proposal.id] = true;
      nextDates[proposal.id] = shared;
    });
    setSelected(nextSelected);
    setDates(nextDates);
    setPerFieldDates(false);
  }, [group]);

  const selectedIds = group?.proposals.filter((item) => selected[item.id]).map((item) => item.id) || [];

  return (
    <Sheet
      open={open && Boolean(group)}
      onClose={onClose}
      title={t('fieldWork.scheduleGroup.title')}
      edge="end"
      size="lg"
      footer={
        <Button
          title={t('fieldWork.actions.schedule')}
          disabled={selectedIds.length === 0 || busy}
          onPress={() => onConfirm({ proposalIds: selectedIds, datesByProposalId: dates })}
        />
      }
    >
      {group ? (
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.textSecondary }}>{t('fieldWork.scheduleGroup.copy')}</Text>
          <Pressable
            onPress={() => {
              const allOn = selectedIds.length === group.proposals.length;
              const next: Record<string, boolean> = {};
              group.proposals.forEach((proposal) => {
                next[proposal.id] = !allOn;
              });
              setSelected(next);
            }}
            style={[styles.row, { minHeight: tapMin }]}
          >
            <Ionicons
              name={selectedIds.length === group.proposals.length ? 'checkbox' : 'square-outline'}
              size={22}
              color={colors.primary}
            />
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
              {t('fieldWork.scheduleGroup.allFields')}
            </Text>
          </Pressable>
          {group.proposals.map((proposal) => (
            <View key={proposal.id} style={{ gap: spacing.sm }}>
              <Pressable
                onPress={() =>
                  setSelected((prev) => ({ ...prev, [proposal.id]: !prev[proposal.id] }))
                }
                style={[styles.row, { minHeight: tapMin }]}
              >
                <Ionicons
                  name={selected[proposal.id] ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={colors.primary}
                />
                <Text style={{ color: colors.textPrimary, flex: 1 }}>
                  {fieldNames[proposal.fieldId] || proposal.fieldId}
                </Text>
              </Pressable>
              {perFieldDates ? (
                <FormDateField
                  label={t('fieldWork.scheduleGroup.sharedDate')}
                  value={dates[proposal.id] || ''}
                  onValueChange={(value) =>
                    setDates((prev) => ({ ...prev, [proposal.id]: value }))
                  }
                />
              ) : null}
            </View>
          ))}
          <Button
            title={
              perFieldDates
                ? t('fieldWork.scheduleGroup.sameDate')
                : t('fieldWork.scheduleGroup.differentDates')
            }
            variant="outline"
            onPress={() => setPerFieldDates((value) => !value)}
          />
          {!perFieldDates ? (
            <FormDateField
              label={t('fieldWork.scheduleGroup.sharedDate')}
              value={dates[group.proposals[0]?.id] || ''}
              onValueChange={(value) => {
                const next: Record<string, string> = {};
                group.proposals.forEach((proposal) => {
                  next[proposal.id] = value;
                });
                setDates(next);
              }}
            />
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

export default ScheduleGroupSheet;
