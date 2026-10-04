import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii } from '../../theme';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import { hexToRgba } from '../../utils/hexToRgba';
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
  fieldColors?: Record<string, string | undefined>;
  unknownField: string;
  busy?: boolean;
  onSchedule: () => void;
  onDismiss: () => void;
  onWhy?: () => void;
};

const GroupedProposalCard = ({
  group,
  fieldNames,
  fieldColors,
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
  const fieldIds = group.fieldIds;
  const visibleIds = expanded ? fieldIds : fieldIds.slice(0, VISIBLE_FIELDS);
  const remaining = fieldIds.length - visibleIds.length;
  const accent = resolveTaskCategoryAccent(lead.templateCode);
  const urgent = group.priority === 'doNow';
  const labelFor = (id: string) =>
    friendlyFieldLabel(fieldNames[id]) || fieldNames[id] || unknownField;
  const meta =
    fieldIds.length > 1
      ? [t('fieldWork.proposal.forFields', { count: fieldIds.length }), period].filter(Boolean).join(' · ')
      : period;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: urgent ? hexToRgba(colors.warning, 0.06) : colors.surface,
          borderColor: urgent ? hexToRgba(colors.warning, 0.4) : colors.borderLight,
          borderLeftWidth: urgent ? 3 : StyleSheet.hairlineWidth,
          borderLeftColor: urgent ? colors.warning : colors.borderLight,
        },
      ]}
    >
      <View style={styles.body}>
        <TaskCategoryGlyph templateCode={lead.templateCode} accent={accent} size={40} />
        <View style={styles.copy}>
          <Text
            style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {meta ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
              {meta}
            </Text>
          ) : null}
          <View style={styles.chips}>
            {visibleIds.map((id) => {
              const color = resolveFieldColor(fieldColors?.[id], id);
              return (
                <View
                  key={id}
                  style={[styles.chip, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }]}
                >
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={[styles.chipText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {labelFor(id)}
                  </Text>
                </View>
              );
            })}
            {remaining > 0 ? (
              <Pressable onPress={() => setExpanded(true)} hitSlop={8}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                  {t('fieldWork.proposal.moreFields', { count: remaining })}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {onWhy ? (
            <Pressable onPress={onWhy} hitSlop={8} style={styles.why}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                {t('fieldWork.proposal.whyRecommended')}
              </Text>
            </Pressable>
          ) : null}
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
          style={[styles.dismiss, { minHeight: Math.max(40, tapMin * 0.8), opacity: busy ? 0.6 : 1 }]}
        >
          <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
            {t('fieldWork.actions.notRelevant', { defaultValue: t('fieldWork.proposal.notForField') })}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  body: { flexDirection: 'row', gap: 12, padding: 14 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontWeight: '700', lineHeight: 22 },
  meta: { fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  dot: { width: 8, height: 8, borderRadius: 99 },
  chipText: { fontSize: 12, fontWeight: '600', maxWidth: 140 },
  why: { marginTop: 2, paddingVertical: 4 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  primary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  dismiss: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
});

export default GroupedProposalCard;
