import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, typography } from '../../theme';
import { HARVEST_ACTION_ICONS } from '../harvestActions';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import type { HarvestCaptureKind } from '../types';

export const HarvestEveningSheet: React.FC<{
  sacks: number;
  people: number;
  expenseEur: number;
  fieldNames: string;
  onAdd: (kind: HarvestCaptureKind) => void;
  onCloseDay: () => void;
}> = ({ sacks, people, expenseEur, fieldNames, onAdd, onCloseDay }) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const hasFacts = sacks > 0 || people > 0 || expenseEur > 0 || Boolean(fieldNames);

  return (
    <HarvestSheetShell
      footer={<Button title={t('harvestCampaign.evening.done')} onPress={onCloseDay} fullWidth />}
    >
      <Text style={[styles.prompt, { color: colors.textPrimary }]}>
        {t('harvestCampaign.evening.recorded')}
      </Text>
      {hasFacts ? (
        <View style={styles.stats}>
          {sacks > 0 ? (
            <View style={[styles.stat, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
              <Text style={{ color: colors.textSecondary }}>{t('harvestCampaign.actions.sacks')}</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>{sacks}</Text>
            </View>
          ) : null}
          {people > 0 ? (
            <View style={[styles.stat, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
              <Text style={{ color: colors.textSecondary }}>{t('harvestCampaign.actions.people')}</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>{people}</Text>
            </View>
          ) : null}
          {expenseEur > 0 ? (
            <View style={[styles.stat, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
              <Text style={{ color: colors.textSecondary }}>{t('harvestCampaign.actions.expense')}</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>{expenseEur} €</Text>
            </View>
          ) : null}
          {fieldNames ? (
            <View style={[styles.statWide, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
              <Text style={{ color: colors.textSecondary }}>{t('harvestCampaign.nav.fields')}</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>{fieldNames}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={{ color: colors.textSecondary }}>{t('harvestCampaign.today.empty')}</Text>
      )}
      <Text style={[styles.section, { color: colors.textSecondary }]}>
        {t('harvestCampaign.evening.missing')}
      </Text>
      <View style={styles.list}>
        {(['mill', 'oil', 'expense'] as const).map((kind) => (
          <Pressable
            key={kind}
            onPress={() => onAdd(kind)}
            style={({ pressed }) => [
              styles.row,
              {
                minHeight: Math.max(64, tapMin + 16),
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.iconWell, { backgroundColor: colors.eventHarvestSoft }]}>
              <Ionicons name={HARVEST_ACTION_ICONS[kind]} size={22} color={colors.eventHarvest} />
            </View>
            <View style={styles.copy}>
              <Text
                style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}
                numberOfLines={1}
              >
                {t(`harvestCampaign.actions.${kind}`)}
              </Text>
              <Text
                style={[styles.hint, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}
                numberOfLines={2}
              >
                {t(`harvestCampaign.actionHint.${kind}`)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        ))}
      </View>
      <Text style={{ color: colors.textSecondary }}>{t('harvestCampaign.evening.laterHint')}</Text>
    </HarvestSheetShell>
  );
};

const styles = StyleSheet.create({
  prompt: { fontWeight: '700', fontSize: 20, letterSpacing: -0.3 },
  section: { fontSize: 13, fontWeight: '700' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { width: '48%', borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, gap: 4 },
  statWide: { width: '100%', borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, gap: 4 },
  value: { fontSize: 18, fontWeight: '800' },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
  title: { fontWeight: '600', letterSpacing: -0.2 },
  hint: { ...typography.styles.caption, lineHeight: 17 },
});
