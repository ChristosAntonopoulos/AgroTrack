import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, radii } from '../../theme';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import AccentCard from '../ui/AccentCard';
import { DOMAIN_ACCENTS } from '../../utils/domainAccents';
import type { FieldWeather } from '../../services/geospatialService';
import type { TaskProposal } from '../../services/fieldWorkService';
import {
  evaluateProposalWeather,
  formatRecommendedPeriod,
  humanMetaLabel,
  proposalChips,
  proposalExplanation,
  proposalTitle,
  weatherExplanationCopy,
  type ProposalDismissDecision,
} from '../../utils/proposalPresentation';
import { TaskCategoryIcon, TaskHelpText, TaskWeatherChip } from './TaskChoiceChips';

const TaskProposalCard = ({
  proposal,
  fieldName,
  weather,
  busy,
  onSchedule,
  onSnooze,
  onDismiss,
}: {
  proposal: TaskProposal;
  fieldName: string;
  weather?: FieldWeather | null;
  busy?: boolean;
  onSchedule: () => void;
  onSnooze: () => void;
  onDismiss: (decision: ProposalDismissDecision) => void;
}) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const language = i18n.language || 'el';
  const title = proposalTitle(proposal, language);
  const explanation = proposalExplanation(proposal, language);
  const period = formatRecommendedPeriod(proposal, language);
  const evaluation = useMemo(() => evaluateProposalWeather(proposal, weather), [proposal, weather]);
  const chips = useMemo(() => proposalChips(proposal, evaluation.kind), [proposal, evaluation.kind]);
  const weatherCopy = weatherExplanationCopy(evaluation.kind, evaluation.facts, language);
  const source = humanMetaLabel(proposal.sourceTypeLabel);
  const confidence = humanMetaLabel(proposal.confidenceLabel);

  return (
    <AccentCard accentColor={DOMAIN_ACCENTS.task} style={styles.card}>
      <View style={styles.header}>
        <TaskCategoryIcon templateCode={proposal.templateCode} />
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
            {title}
          </Text>
          <Text style={[styles.field, { color: colors.textSecondary }]} numberOfLines={1}>
            {fieldName}
          </Text>
        </View>
      </View>
      {explanation ? (
        <Text style={[styles.reason, { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }]}>
          {explanation}
        </Text>
      ) : null}
      {period ? (
        <Text style={[styles.period, { color: colors.textTertiary }]}>
          {t('fieldWork.proposal.period')} {period}
        </Text>
      ) : null}
      <View style={styles.chips}>
        {chips.map((chip) => (
          <TaskWeatherChip
            key={chip.id}
            kind={chip.id}
            label={chip.id === 'unknown' ? t('fieldWork.weather.unknown') : t(chip.labelKey)}
          />
        ))}
      </View>
      <View style={styles.actions}>
        <Button
          title={t('fieldWork.actions.scheduleIt')}
          onPress={onSchedule}
          disabled={busy}
          style={styles.schedule}
        />
        <Pressable
          onPress={() => setMoreOpen(true)}
          disabled={busy}
          style={[
            styles.more,
            {
              borderColor: colors.oliveBorder,
              minHeight: tapMin,
              minWidth: tapMin,
            },
          ]}
          accessibilityLabel={t('fieldWork.proposal.more')}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <Sheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={t('fieldWork.proposal.more')}
        edge="bottom"
        size="sm"
      >
        <Button
          title={t('fieldWork.proposal.remindLater')}
          variant="outline"
          onPress={() => {
            setMoreOpen(false);
            onSnooze();
          }}
        />
        <View style={{ height: spacing.sm }} />
        <Button
          title={t('fieldWork.proposal.notForField')}
          variant="outline"
          onPress={() => {
            setMoreOpen(false);
            onDismiss('not_for_this_field');
          }}
        />
        <View style={{ height: spacing.sm }} />
        <Button
          title={t('fieldWork.proposal.notThisYear')}
          variant="outline"
          onPress={() => {
            setMoreOpen(false);
            onDismiss('dismiss_for_year');
          }}
        />
        <View style={{ height: spacing.sm }} />
        <Button
          title={t('fieldWork.proposal.why')}
          variant="ghost"
          onPress={() => {
            setMoreOpen(false);
            setWhyOpen(true);
          }}
        />
      </Sheet>

      <Sheet
        open={whyOpen}
        onClose={() => setWhyOpen(false)}
        title={t('fieldWork.proposal.why')}
        edge="bottom"
        size="md"
      >
        <Text style={[styles.whyTitle, { color: colors.textPrimary }]}>{fieldName}</Text>
        <Text style={[styles.reason, { color: colors.textSecondary }]}>{explanation}</Text>
        {period ? (
          <Text style={[styles.period, { color: colors.textTertiary, marginTop: spacing.sm }]}>
            {t('fieldWork.proposal.period')} {period}
          </Text>
        ) : null}
        {source ? (
          <Text style={[styles.period, { color: colors.textTertiary }]}>
            {t('fieldWork.proposal.source')} {source}
          </Text>
        ) : null}
        {confidence ? (
          <Text style={[styles.period, { color: colors.textTertiary }]}>
            {t('fieldWork.proposal.confidence')} {confidence}
          </Text>
        ) : null}
        {weatherCopy.headline ? <TaskHelpText>{weatherCopy.headline}</TaskHelpText> : null}
        {weatherCopy.facts.map((fact) => (
          <TaskHelpText key={fact}>{fact}</TaskHelpText>
        ))}
        <View style={{ height: spacing.md }} />
        <Button title={t('fieldWork.proposal.close')} variant="outline" onPress={() => setWhyOpen(false)} />
      </Sheet>
    </AccentCard>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  header: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { ...typography.styles.body, fontWeight: '700' },
  field: { ...typography.styles.bodySmall, marginTop: 2 },
  reason: { ...typography.styles.bodySmall, lineHeight: 20, marginBottom: spacing.xs },
  period: { ...typography.styles.caption, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  schedule: { flex: 1 },
  more: {
    borderWidth: 1,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  whyTitle: { ...typography.styles.h4, fontWeight: '700', marginBottom: spacing.sm },
});

export default TaskProposalCard;
