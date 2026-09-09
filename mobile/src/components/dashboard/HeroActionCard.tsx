import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';
import type { MeDashboardPending, MeDashboardTopAction } from '../../services/meDashboardService';

export interface HeroActionCardProps {
  topAction: MeDashboardTopAction;
  pending: MeDashboardPending;
  role?: string;
  onPress: (path: 'Tasks' | 'Today' | 'Fields' | 'Partners' | 'CreateTask') => void;
  tapMin?: number;
}

const HeroActionCard: React.FC<HeroActionCardProps> = ({
  topAction,
  pending,
  role,
  onPress,
  tapMin = 44,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation('dashboard');
  const isOwner = role === 'FieldOwner' || role === 'Administrator';
  const isProducer = role === 'Producer';
  const isPartner = role === 'ServiceProvider';

  let kind: 'alert' | 'action' | 'default' = 'default';
  let title = t('myActions.hero.defaultTitle');
  let subtitle = t('myActions.hero.defaultSubtitle');
  let cta = t('myActions.hero.defaultCta');
  let target: 'Tasks' | 'Today' | 'Fields' | 'Partners' | 'CreateTask' = isProducer
    ? 'Today'
    : isPartner
      ? 'Partners'
      : 'Tasks';
  let icon: React.ComponentProps<typeof Ionicons>['name'] = 'sunny-outline';

  if (pending.overdue > 0) {
    kind = 'alert';
    title = t('myActions.hero.overdueTitle', { count: pending.overdue });
    subtitle = t('myActions.hero.overdueSubtitle');
    cta = t('myActions.hero.overdueCta');
    target = 'Tasks';
    icon = 'alert-circle-outline';
  } else if (isOwner && pending.pendingApproval > 0) {
    kind = 'alert';
    title = t('myActions.hero.approvalTitle', { count: pending.pendingApproval });
    subtitle = t('myActions.hero.approvalSubtitle');
    cta = t('myActions.hero.approvalCta');
    target = 'Tasks';
    icon = 'checkmark-done-outline';
  } else if (topAction === 'complete_task') {
    kind = 'action';
    title = t('myActions.hero.completeTaskTitle');
    subtitle = t('myActions.hero.completeTaskSubtitle');
    cta = t('myActions.hero.completeTaskCta');
    target = isProducer ? 'Today' : 'Tasks';
    icon = 'list-outline';
  } else if (topAction === 'add_evidence') {
    kind = 'action';
    title = t('myActions.hero.addEvidenceTitle');
    subtitle = t('myActions.hero.addEvidenceSubtitle');
    cta = t('myActions.hero.addEvidenceCta');
    target = 'Tasks';
    icon = 'camera-outline';
  } else if (topAction === 'log_harvest') {
    kind = 'action';
    title = t('myActions.hero.logHarvestTitle');
    subtitle = t('myActions.hero.logHarvestSubtitle');
    cta = t('myActions.hero.logHarvestCta');
    target = 'Fields';
    icon = 'leaf-outline';
  } else if (topAction === 'log_expense') {
    kind = 'action';
    title = t('myActions.hero.logExpenseTitle');
    subtitle = t('myActions.hero.logExpenseSubtitle');
    cta = t('myActions.hero.logExpenseCta');
    target = 'Fields';
    icon = 'cash-outline';
  } else if (topAction === 'contact_partner') {
    kind = 'action';
    title = t('myActions.hero.contactPartnerTitle');
    subtitle = t('myActions.hero.contactPartnerSubtitle');
    cta = t('myActions.hero.contactPartnerCta');
    target = 'Partners';
    icon = 'people-outline';
  } else if (isOwner) {
    title = t('myActions.hero.ownerDefaultTitle');
    subtitle = t('myActions.hero.ownerDefaultSubtitle');
    cta = t('myActions.hero.ownerDefaultCta');
    target = 'CreateTask';
    icon = 'add-circle-outline';
  }

  const accent = kind === 'alert' ? colors.warning : colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderLight,
          borderLeftColor: accent,
          minHeight: Math.max(88, tapMin + 44),
          ...createElevation(colors, 'sm'),
        },
      ]}
      onPress={() => onPress(target)}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
          <Ionicons name={icon} size={24} color={accent} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      <Text style={[styles.cta, { color: colors.primary }]}>{cta}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { ...typography.styles.body, fontWeight: '700' },
  subtitle: { ...typography.styles.caption, marginTop: 2 },
  cta: { ...typography.styles.bodySmall, fontWeight: '700', alignSelf: 'flex-end' },
});

export default HeroActionCard;
