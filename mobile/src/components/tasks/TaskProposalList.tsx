import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { TaskProposal } from '../../services/fieldWorkService';
import {
  formatRecommendedPeriod,
  groupProposalsByTemplate,
  proposalExplanation,
  proposalTitle,
  sectionProposalGroups,
  type ProposalTemplateGroup,
} from '../../utils/proposalPresentation';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import { hexToRgba } from '../../utils/hexToRgba';
import GroupedProposalCard from './GroupedProposalCard';
import TaskCategoryGlyph from './TaskCategoryGlyph';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import { spacing, typography, radii } from '../../theme';

export type ProposalDismissChoice = 'dont_do' | 'already_done' | 'remind_later';

type Props = {
  proposals: TaskProposal[];
  fieldNames: Record<string, string>;
  fieldColors?: Record<string, string | undefined>;
  unknownField: string;
  busyId: string | null;
  onScheduleGroup: (group: ProposalTemplateGroup) => void;
  onDismissChoice: (group: ProposalTemplateGroup, choice: ProposalDismissChoice) => void;
};

const TaskProposalList: React.FC<Props> = ({
  proposals,
  fieldNames,
  fieldColors,
  unknownField,
  busyId,
  onScheduleGroup,
  onDismissChoice,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors, tapMin } = useTheme();
  const [whyGroup, setWhyGroup] = useState<ProposalTemplateGroup | null>(null);
  const [dismissGroup, setDismissGroup] = useState<ProposalTemplateGroup | null>(null);
  const [laterCollapsed, setLaterCollapsed] = useState(true);

  const grouped = useMemo(() => groupProposalsByTemplate(proposals), [proposals]);
  const sections = useMemo(() => sectionProposalGroups(grouped), [grouped]);

  if (proposals.length === 0) return null;

  const fieldLabel = (id: string) =>
    friendlyFieldLabel(fieldNames[id]) || fieldNames[id] || unknownField;

  const renderSection = (
    id: string,
    label: string,
    items: ProposalTemplateGroup[],
    collapsed?: boolean
  ) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            {label} · {items.length}
          </Text>
          {collapsed != null ? (
            <Pressable onPress={() => setLaterCollapsed((value) => !value)} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {collapsed ? t('fieldWork.proposal.showLater') : t('fieldWork.proposal.hideLater')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {collapsed ? null : (
          <View style={styles.list}>
            {items.map((group) => (
              <GroupedProposalCard
                key={group.key}
                group={group}
                fieldNames={fieldNames}
                fieldColors={fieldColors}
                unknownField={unknownField}
                busy={group.proposals.some((item) => item.id === busyId)}
                onSchedule={() => onScheduleGroup(group)}
                onDismiss={() => setDismissGroup(group)}
                onWhy={() => setWhyGroup(group)}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const whyLead = whyGroup?.proposals[0];
  const whyTitle = whyLead ? proposalTitle(whyLead, i18n.language) : '';
  const whyPeriod = whyLead ? formatRecommendedPeriod(whyLead, i18n.language) : '';
  const whyAccent = resolveTaskCategoryAccent(whyGroup?.templateCode);
  const whyBusy = whyGroup ? whyGroup.proposals.some((p) => p.id === busyId) : false;

  const choiceRow = (
    label: string,
    hint: string,
    onPress: () => void,
    caution?: boolean
  ) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.choiceRow,
        {
          minHeight: Math.max(56, tapMin),
          borderColor: caution ? hexToRgba(colors.warning, 0.4) : colors.borderLight,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <Text style={[styles.choiceLabel, { color: caution ? colors.warning : colors.textPrimary }]}>
        {label}
      </Text>
      <Text style={[styles.choiceHint, { color: colors.textSecondary }]}>{hint}</Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      {renderSection('doNow', t('fieldWork.proposalGroups.doNow'), sections.doNow)}
      {renderSection('canWait', t('fieldWork.proposalGroups.canWait'), sections.canWait)}
      {renderSection(
        'laterYear',
        t('fieldWork.proposalGroups.laterYear'),
        sections.laterYear,
        laterCollapsed
      )}

      <Sheet
        open={Boolean(whyGroup)}
        onClose={() => setWhyGroup(null)}
        title={t('fieldWork.proposal.whyRecommended')}
        edge="end"
        size="lg"
        footer={
          whyGroup ? (
            <View style={styles.whyFooter}>
              <Button
                title={t('fieldWork.actions.schedule')}
                disabled={whyBusy}
                onPress={() => {
                  onScheduleGroup(whyGroup);
                  setWhyGroup(null);
                }}
              />
              <Pressable
                onPress={() => {
                  setDismissGroup(whyGroup);
                  setWhyGroup(null);
                }}
                style={styles.whyDismiss}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600', textAlign: 'center' }}>
                  {t('fieldWork.actions.notRelevant')}
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      >
        {whyGroup && whyLead ? (
          <View style={styles.whyBody}>
            <View style={styles.whyHero}>
              <TaskCategoryGlyph templateCode={whyGroup.templateCode} accent={whyAccent} size={44} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.whyKicker, { color: colors.textTertiary }]}>
                  {t('fieldWork.proposal.whyIntro')}
                </Text>
                <Text style={[styles.whyTitle, { color: colors.textPrimary }]}>{whyTitle}</Text>
              </View>
            </View>

            <View
              style={[
                styles.whyCallout,
                {
                  backgroundColor: hexToRgba(colors.primary, 0.08),
                  borderColor: hexToRgba(colors.primary, 0.22),
                },
              ]}
            >
              <Text style={{ color: colors.textPrimary, lineHeight: 22 }}>
                {proposalExplanation(whyLead, i18n.language)}
              </Text>
            </View>

            {whyPeriod ? (
              <View style={styles.whyFact}>
                <Text style={[styles.whyLabel, { color: colors.textTertiary }]}>
                  {t('fieldWork.proposal.suitablePeriod')}
                </Text>
                <View style={[styles.whyChip, { backgroundColor: colors.surfaceMuted }]}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{whyPeriod}</Text>
                </View>
              </View>
            ) : null}

            {whyGroup.fieldIds.length > 0 ? (
              <View style={styles.whyFact}>
                <Text style={[styles.whyLabel, { color: colors.textTertiary }]}>
                  {t('fieldWork.proposal.fieldsLabel')}
                </Text>
                <View style={styles.chips}>
                  {whyGroup.fieldIds.map((id) => {
                    const color = resolveFieldColor(fieldColors?.[id], id);
                    return (
                      <View
                        key={id}
                        style={[
                          styles.chip,
                          { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight },
                        ]}
                      >
                        <View style={[styles.dot, { backgroundColor: color }]} />
                        <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                          {fieldLabel(id)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
              {t('fieldWork.proposal.whyScheduleHint')}
            </Text>
          </View>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(dismissGroup)}
        onClose={() => setDismissGroup(null)}
        title={t('fieldWork.dismiss.title')}
        edge="bottom"
        size="md"
      >
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 20 }}>
          {t('fieldWork.dismiss.copy')}
        </Text>
        <View style={{ gap: spacing.sm }}>
          {choiceRow(
            t('fieldWork.dismiss.dontDo'),
            t('fieldWork.dismiss.dontDoHint'),
            () => {
              if (!dismissGroup) return;
              onDismissChoice(dismissGroup, 'dont_do');
              setDismissGroup(null);
            },
            true
          )}
          {choiceRow(
            t('fieldWork.dismiss.alreadyDone'),
            t('fieldWork.dismiss.alreadyDoneHint'),
            () => {
              if (!dismissGroup) return;
              onDismissChoice(dismissGroup, 'already_done');
              setDismissGroup(null);
            }
          )}
          {choiceRow(
            t('fieldWork.dismiss.remindLater'),
            t('fieldWork.dismiss.remindLaterHint'),
            () => {
              if (!dismissGroup) return;
              onDismissChoice(dismissGroup, 'remind_later');
              setDismissGroup(null);
            }
          )}
        </View>
      </Sheet>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typography.styles.overline },
  list: { gap: spacing.sm },
  whyBody: { gap: spacing.md },
  whyHero: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  whyKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  whyTitle: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  whyCallout: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  whyFact: { gap: 8 },
  whyLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  whyChip: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 99 },
  whyFooter: { gap: spacing.sm },
  whyDismiss: { paddingVertical: 10 },
  choiceRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  choiceLabel: { fontSize: 16, fontWeight: '700' },
  choiceHint: { fontSize: 13, lineHeight: 18 },
});

export default TaskProposalList;
