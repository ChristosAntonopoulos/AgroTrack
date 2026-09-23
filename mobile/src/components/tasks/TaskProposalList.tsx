import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { TaskProposal } from '../../services/fieldWorkService';
import {
  groupProposalsByTemplate,
  proposalExplanation,
  sectionProposalGroups,
  type ProposalTemplateGroup,
} from '../../utils/proposalPresentation';
import GroupedProposalCard from './GroupedProposalCard';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import { spacing, typography, radii, createElevation } from '../../theme';

export type ProposalDismissChoice = 'dont_do' | 'already_done' | 'remind_later';

type Props = {
  proposals: TaskProposal[];
  fieldNames: Record<string, string>;
  unknownField: string;
  busyId: string | null;
  onScheduleGroup: (group: ProposalTemplateGroup) => void;
  onDismissChoice: (group: ProposalTemplateGroup, choice: ProposalDismissChoice) => void;
};

const TaskProposalList: React.FC<Props> = ({
  proposals,
  fieldNames,
  unknownField,
  busyId,
  onScheduleGroup,
  onDismissChoice,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors } = useTheme();
  const [whyGroup, setWhyGroup] = useState<ProposalTemplateGroup | null>(null);
  const [dismissGroup, setDismissGroup] = useState<ProposalTemplateGroup | null>(null);
  const [laterCollapsed, setLaterCollapsed] = useState(true);

  const grouped = useMemo(() => groupProposalsByTemplate(proposals), [proposals]);
  const sections = useMemo(() => sectionProposalGroups(grouped), [grouped]);

  if (proposals.length === 0) return null;

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

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.introCard,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight, ...createElevation(colors, 'flat') },
        ]}
      >
        <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
          {t('fieldWork.proposalsIntro.title')}
        </Text>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          {t('fieldWork.proposalsIntro.subtitle')}
        </Text>
      </View>
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
        title={t('fieldWork.proposal.why')}
        edge="end"
        size="md"
      >
        <Text style={{ color: colors.textPrimary, lineHeight: 22 }}>
          {whyGroup
            ? proposalExplanation(whyGroup.proposals[0], i18n.language)
            : ''}
        </Text>
      </Sheet>

      <Sheet
        open={Boolean(dismissGroup)}
        onClose={() => setDismissGroup(null)}
        title={t('fieldWork.dismiss.title')}
        edge="bottom"
        size="md"
      >
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
          {t('fieldWork.dismiss.copy')}
        </Text>
        <View style={{ gap: spacing.sm }}>
          <Button
            title={t('fieldWork.dismiss.dontDo')}
            onPress={() => {
              if (!dismissGroup) return;
              onDismissChoice(dismissGroup, 'dont_do');
              setDismissGroup(null);
            }}
          />
          <Button
            title={t('fieldWork.dismiss.alreadyDone')}
            variant="outline"
            onPress={() => {
              if (!dismissGroup) return;
              onDismissChoice(dismissGroup, 'already_done');
              setDismissGroup(null);
            }}
          />
          <Button
            title={t('fieldWork.dismiss.remindLater')}
            variant="outline"
            onPress={() => {
              if (!dismissGroup) return;
              onDismissChoice(dismissGroup, 'remind_later');
              setDismissGroup(null);
            }}
          />
        </View>
      </Sheet>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  introCard: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 4,
  },
  introTitle: { fontWeight: '700', fontSize: 16 },
  intro: { ...typography.styles.bodySmall, lineHeight: 20 },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typography.styles.overline },
  list: { gap: spacing.sm },
});

export default TaskProposalList;
