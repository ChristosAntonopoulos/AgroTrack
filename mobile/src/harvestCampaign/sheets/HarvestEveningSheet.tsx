import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';
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
  const { colors } = useTheme();
  const hasFacts = sacks > 0 || people > 0 || expenseEur > 0 || Boolean(fieldNames);

  return (
    <HarvestSheetShell
      footer={
        <Button title={t('harvestCampaign.evening.done')} onPress={onCloseDay} fullWidth />
      }
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
      <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
        {t('harvestCampaign.evening.missing')}
      </Text>
      {(['mill', 'oil', 'expense'] as const).map((kind) => (
        <Button
          key={kind}
          title={t(`harvestCampaign.actions.${kind}`)}
          variant="outline"
          onPress={() => onAdd(kind)}
          fullWidth
        />
      ))}
      <Text style={{ color: colors.textSecondary }}>{t('harvestCampaign.evening.laterHint')}</Text>
    </HarvestSheetShell>
  );
};

const styles = StyleSheet.create({
  prompt: { fontWeight: '700', fontSize: 16 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { width: '48%', borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, gap: 4 },
  statWide: { width: '100%', borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, gap: 4 },
  value: { fontSize: 18, fontWeight: '800' },
});
