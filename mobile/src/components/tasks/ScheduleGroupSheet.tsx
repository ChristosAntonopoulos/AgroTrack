import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import FormDateField from '../forms/FormDateField';
import { useTheme } from '../../context/ThemeContext';
import type { ProposalTemplateGroup } from '../../utils/proposalPresentation';
import { proposalTitle, toDateInputValue } from '../../utils/proposalPresentation';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { hexToRgba } from '../../utils/hexToRgba';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import { radii, spacing } from '../../theme';
import TaskCategoryGlyph from './TaskCategoryGlyph';

type Props = {
  group: ProposalTemplateGroup | null;
  fieldNames: Record<string, string>;
  fieldColors?: Record<string, string | undefined>;
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
  fieldColors,
  open,
  busy,
  onClose,
  onConfirm,
}) => {
  const { t, i18n } = useTranslation('tasks');
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

  const selectedIds = useMemo(
    () => group?.proposals.filter((item) => selected[item.id]).map((item) => item.id) || [],
    [group, selected]
  );

  const multiField = (group?.proposals.length || 0) > 1;
  const allSelected = Boolean(group && selectedIds.length === group.proposals.length);
  const lead = group?.proposals[0];
  const title = lead ? proposalTitle(lead, i18n.language) : '';
  const accent = resolveTaskCategoryAccent(group?.templateCode);
  const unknownField = t('fieldWork.unknownField');
  const canConfirm =
    selectedIds.length > 0 &&
    selectedIds.every((id) => Boolean(dates[id])) &&
    !busy;

  const labelFor = (fieldId: string) =>
    friendlyFieldLabel(fieldNames[fieldId]) || fieldNames[fieldId] || unknownField;

  const setSharedDate = (value: string) => {
    if (!group) return;
    const next: Record<string, string> = {};
    group.proposals.forEach((proposal) => {
      next[proposal.id] = value;
    });
    setDates(next);
  };

  const rowStyle = (isOn: boolean) => [
    styles.choiceRow,
    {
      minHeight: Math.max(52, tapMin),
      borderColor: isOn ? hexToRgba(colors.primary, 0.45) : colors.borderLight,
      backgroundColor: isOn ? hexToRgba(colors.primary, 0.08) : colors.surface,
    },
  ];

  const checkBox = (isOn: boolean) => (
    <View
      style={[
        styles.check,
        {
          borderColor: isOn ? colors.primary : colors.borderLight,
          backgroundColor: isOn ? colors.primary : colors.surface,
        },
      ]}
    >
      {isOn ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
    </View>
  );

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
          disabled={!canConfirm}
          onPress={() => onConfirm({ proposalIds: selectedIds, datesByProposalId: dates })}
        />
      }
    >
      {group ? (
        <View style={styles.body}>
          <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
            {t('fieldWork.scheduleGroup.copy')}
          </Text>

          {title ? (
            <View
              style={[
                styles.context,
                { backgroundColor: hexToRgba(colors.textPrimary, 0.04) },
              ]}
            >
              <TaskCategoryGlyph templateCode={group.templateCode} accent={accent} size={36} />
              <Text style={[styles.contextTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {title}
              </Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                {t('fieldWork.proposal.fieldsLabel')}
              </Text>
              {multiField ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                  {t('fieldWork.scheduleGroup.selectedCount', {
                    selected: selectedIds.length,
                    total: group.proposals.length,
                  })}
                </Text>
              ) : null}
            </View>

            {multiField ? (
              <Pressable
                onPress={() => {
                  const next: Record<string, boolean> = {};
                  group.proposals.forEach((proposal) => {
                    next[proposal.id] = !allSelected;
                  });
                  setSelected(next);
                }}
                style={rowStyle(allSelected)}
                accessibilityRole="button"
                accessibilityState={{ selected: allSelected }}
              >
                {checkBox(allSelected)}
                <Text style={[styles.choiceLabel, { color: colors.textPrimary }]}>
                  {t('fieldWork.scheduleGroup.allFields')}
                </Text>
              </Pressable>
            ) : null}

            {group.proposals.map((proposal) => {
              const isOn = Boolean(selected[proposal.id]);
              const color = resolveFieldColor(fieldColors?.[proposal.fieldId], proposal.fieldId);
              return (
                <View key={proposal.id} style={{ gap: spacing.sm }}>
                  <Pressable
                    onPress={() =>
                      setSelected((prev) => ({ ...prev, [proposal.id]: !prev[proposal.id] }))
                    }
                    style={rowStyle(isOn)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isOn }}
                  >
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <Text
                      style={[styles.choiceLabel, { color: colors.textPrimary, flex: 1 }]}
                      numberOfLines={1}
                    >
                      {labelFor(proposal.fieldId)}
                    </Text>
                    {checkBox(isOn)}
                  </Pressable>
                  {perFieldDates && isOn ? (
                    <View style={[styles.nestedDate, { borderLeftColor: hexToRgba(colors.primary, 0.28) }]}>
                      <FormDateField
                        label={t('fieldWork.scheduleGroup.sharedDate')}
                        value={dates[proposal.id] || ''}
                        onValueChange={(value) =>
                          setDates((prev) => ({ ...prev, [proposal.id]: value }))
                        }
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              {t('fieldWork.scheduleGroup.whenLabel')}
            </Text>

            {multiField ? (
              <>
                <Pressable
                  onPress={() => setPerFieldDates(false)}
                  style={rowStyle(!perFieldDates)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !perFieldDates }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.choiceLabel, { color: colors.textPrimary }]}>
                      {t('fieldWork.scheduleGroup.sameDate')}
                    </Text>
                    <Text style={[styles.choiceHint, { color: colors.textSecondary }]}>
                      {t('fieldWork.scheduleGroup.sameDateHint')}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => setPerFieldDates(true)}
                  style={rowStyle(perFieldDates)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: perFieldDates }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.choiceLabel, { color: colors.textPrimary }]}>
                      {t('fieldWork.scheduleGroup.differentDates')}
                    </Text>
                    <Text style={[styles.choiceHint, { color: colors.textSecondary }]}>
                      {t('fieldWork.scheduleGroup.differentDatesHint')}
                    </Text>
                  </View>
                </Pressable>
              </>
            ) : null}

            {!perFieldDates || !multiField ? (
              <FormDateField
                label={t('fieldWork.scheduleGroup.sharedDate')}
                value={dates[group.proposals[0]?.id] || ''}
                onValueChange={setSharedDate}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.lg,
  },
  contextTitle: { flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  section: { gap: 10 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.04,
    textTransform: 'uppercase',
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  choiceLabel: { fontSize: 16, fontWeight: '700' },
  choiceHint: { fontSize: 13, lineHeight: 18 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 99 },
  nestedDate: {
    marginLeft: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
});

export default ScheduleGroupSheet;
