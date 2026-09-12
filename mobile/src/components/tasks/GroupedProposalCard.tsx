import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, radii } from '../../theme';
import Button from '../ui/Button';
import AccentCard from '../ui/AccentCard';
import { DOMAIN_ACCENTS } from '../../utils/domainAccents';
import {
  formatRecommendedPeriod,
  proposalExplanation,
  proposalTitle,
  type ProposalTemplateGroup,
} from '../../utils/proposalPresentation';

const VISIBLE_FIELDS = 3;

type Props = {
  group: ProposalTemplateGroup;
  fieldNames: Record<string, string>;
  unknownField: string;
  busy?: boolean;
  onSchedule: () => void;
  onDismiss: () => void;
  onWhy?: () => void;
};

const GroupedProposalCard = ({
  group,
  fieldNames,
  unknownField,
  busy,
  onSchedule,
  onDismiss,
  onWhy,
}: Props) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors, fontScaleMultiplier } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const title = proposalTitle(group.proposals[0], i18n.language);
  const period = formatRecommendedPeriod(group.proposals[0], i18n.language);
  const explanation = proposalExplanation(group.proposals[0], i18n.language);
  const fieldLabels = group.fieldIds.map((id) => fieldNames[id] || unknownField);
  const visible = expanded ? fieldLabels : fieldLabels.slice(0, VISIBLE_FIELDS);
  const remaining = fieldLabels.length - visible.length;

  return (
    <AccentCard accentColor={DOMAIN_ACCENTS.task} style={styles.card}>
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
        {title}
      </Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {t('fieldWork.proposal.forFields', { count: group.fieldIds.length })}
      </Text>
      {period ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {t('fieldWork.proposal.suitablePeriod')}: {period}
        </Text>
      ) : null}
      <View style={styles.chips}>
        {visible.map((name) => (
          <View
            key={name}
            style={[styles.chip, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }]}
          >
            <Text style={[styles.chipText, { color: colors.textSecondary }]} numberOfLines={1}>
              {name}
            </Text>
          </View>
        ))}
        {remaining > 0 ? (
          <Pressable onPress={() => setExpanded(true)}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {t('fieldWork.proposal.moreFields', { count: remaining })}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={onWhy}>
        <Text style={[styles.why, { color: colors.primary }]}>
          {t('fieldWork.proposal.whyRecommended')}
        </Text>
      </Pressable>
      <Text style={[styles.explanation, { color: colors.textSecondary }]}>{explanation}</Text>
      <View style={styles.actions}>
        <Button
          title={t('fieldWork.actions.schedule', { defaultValue: t('fieldWork.actions.scheduleIt') })}
          onPress={onSchedule}
          disabled={busy}
        />
        <Button
          title={t('fieldWork.actions.notRelevant', { defaultValue: t('fieldWork.proposal.notForField') })}
          variant="outline"
          onPress={onDismiss}
          disabled={busy}
        />
      </View>
    </AccentCard>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.sm },
  title: { ...typography.styles.body, fontWeight: '700' },
  meta: { ...typography.styles.bodySmall },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  chipText: { ...typography.styles.caption, fontWeight: '600', maxWidth: 140 },
  why: { ...typography.styles.bodySmall, fontWeight: '700' },
  explanation: { ...typography.styles.bodySmall, lineHeight: 20 },
  actions: { gap: spacing.sm },
});

export default GroupedProposalCard;
