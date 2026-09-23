import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, createElevation, motion } from '../../theme';
import { resolveFieldColor } from '../../utils/fieldColors';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import {
  formatRecommendedPeriod,
  proposalTitle,
  type ProposalTemplateGroup,
} from '../../utils/proposalPresentation';
import TaskCategoryGlyph from './TaskCategoryGlyph';

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
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const lead = group.proposals[0];
  const title = proposalTitle(lead, i18n.language);
  const period = formatRecommendedPeriod(lead, i18n.language);
  const fieldLabels = group.fieldIds.map((id) => fieldNames[id] || unknownField);
  const visible = expanded ? fieldLabels : fieldLabels.slice(0, VISIBLE_FIELDS);
  const remaining = fieldLabels.length - visible.length;
  const accent = resolveTaskCategoryAccent(lead.templateCode);
  const rail = resolveFieldColor(undefined, group.fieldIds[0]) || accent;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <View style={[styles.rail, { backgroundColor: rail }]} />
      <View style={styles.body}>
        <TaskCategoryGlyph templateCode={lead.templateCode} accent={accent} />
        <View style={styles.copy}>
          <Text
            style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {t('fieldWork.proposal.forFields', { count: group.fieldIds.length })}
            {period ? ` · ${period}` : ''}
          </Text>
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
              <Pressable onPress={() => setExpanded(true)} hitSlop={8}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                  {t('fieldWork.proposal.moreFields', { count: remaining })}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={onSchedule}
          disabled={busy}
          style={[
            styles.primary,
            {
              minHeight: Math.max(44, tapMin * 0.92),
              backgroundColor: colors.primary,
              opacity: busy ? 0.6 : 1,
            },
          ]}
        >
          <Text style={{ color: colors.onOlive, fontWeight: '700' }}>
            {t('fieldWork.actions.schedule', { defaultValue: t('fieldWork.actions.scheduleIt') })}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          disabled={busy}
          style={[
            styles.ghost,
            {
              minHeight: Math.max(44, tapMin * 0.92),
              borderColor: colors.borderLight,
              backgroundColor: colors.surfaceMuted,
              opacity: busy ? 0.6 : 1,
            },
          ]}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
            {t('fieldWork.actions.notRelevant', { defaultValue: t('fieldWork.proposal.notForField') })}
          </Text>
        </Pressable>
      </View>
      {onWhy ? (
        <Pressable
          onPress={onWhy}
          style={({ pressed }) => [styles.why, { opacity: pressed ? motion.pressOpacity : 1 }]}
        >
          <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
            {t('fieldWork.proposal.whyRecommended')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  body: { flexDirection: 'row', gap: 12, padding: 14, paddingLeft: 18 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontWeight: '700', lineHeight: 22 },
  meta: { fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  chipText: { fontSize: 12, fontWeight: '600', maxWidth: 140 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingLeft: 18,
    paddingBottom: 8,
  },
  primary: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  ghost: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  why: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingBottom: 12,
    paddingTop: 4,
  },
});

export default GroupedProposalCard;
