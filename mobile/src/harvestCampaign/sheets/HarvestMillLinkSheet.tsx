import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { radii, spacing } from '../../theme';
import { HarvestSegmentedControl } from '../components/HarvestSegmentedControl';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { unconfirmedSacks } from '../storage';
import type { HarvestSheetSharedProps } from './types';

export const HarvestMillLinkSheet: React.FC<
  HarvestSheetSharedProps & {
    filterFieldIds?: string[];
    onSave: (sackIds: string[]) => void;
  }
> = ({ campaign, fields, today, filterFieldIds, onSave, onClose }) => {
  const { t } = useTranslation(['fields', 'common']);
  const { colors, tapMin } = useTheme();
  const pending = unconfirmedSacks(campaign, filterFieldIds);
  const [customizing, setCustomizing] = useState(false);
  const [linkMode, setLinkMode] = useState<'all' | 'pick' | 'skip'>('all');
  const [pickedSacks, setPickedSacks] = useState(pending.map((row) => row.id));
  const selectedSacks =
    linkMode === 'skip' ? [] : linkMode === 'all' ? pending.map((row) => row.id) : pickedSacks;
  const fieldLabel = (id: string) =>
    friendlyFieldLabel(fields.find((f) => f.id === id)?.name || id);

  return (
    <HarvestSheetShell
      footer={
        <>
          <Button
            title={
              linkMode === 'skip'
                ? t('fields:harvestCampaign.millKg.linkSkip')
                : t('fields:harvestCampaign.millKg.linkFound', { count: selectedSacks.length })
            }
            onPress={() => onSave(selectedSacks)}
            fullWidth
          />
          <Button title={t('common:cancel')} variant="ghost" onPress={onClose} fullWidth />
        </>
      }
    >
      <Text style={[styles.prompt, { color: colors.textPrimary }]}>
        {t('fields:harvestCampaign.millKg.linkTitle')}
      </Text>
      {pending.map((sack) => {
        const checked =
          linkMode === 'skip' ? false : linkMode === 'all' || pickedSacks.includes(sack.id);
        const interactive = customizing && linkMode === 'pick';
        return (
          <Pressable
            key={sack.id}
            disabled={!interactive}
            onPress={() =>
              setPickedSacks((prev) =>
                prev.includes(sack.id) ? prev.filter((id) => id !== sack.id) : [...prev, sack.id]
              )
            }
            style={[
              styles.row,
              {
                minHeight: tapMin,
                borderColor: checked ? colors.oliveBorder : colors.borderLight,
                backgroundColor: checked ? colors.primaryLight : colors.surface,
              },
            ]}
          >
            <View
              style={[
                styles.check,
                {
                  borderColor: checked ? colors.primary : colors.border,
                  backgroundColor: checked ? colors.primary : 'transparent',
                },
              ]}
            >
              {checked ? <Ionicons name="checkmark" size={14} color={colors.onOlive} /> : null}
            </View>
            <Text style={{ color: colors.textSecondary, flex: 1 }}>
              {t(`fields:harvestCampaign.relative.${sack.date === today ? 'today' : 'other'}`, {
                date: sack.date,
              })}{' '}
              · {sack.sacks} {t('fields:harvestCampaign.sacks.unit')} · {fieldLabel(sack.fieldId)}
            </Text>
          </Pressable>
        );
      })}
      {!customizing ? (
        <Button
          title={t('fields:harvestCampaign.millKg.changeSelection')}
          variant="outline"
          onPress={() => setCustomizing(true)}
        />
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('fields:harvestCampaign.millKg.linkModeTitle')}
          </Text>
          <HarvestSegmentedControl
            value={linkMode}
            ariaLabel={t('fields:harvestCampaign.millKg.linkTitle')}
            onChange={(next) => {
              setLinkMode(next);
              if (next === 'pick') setPickedSacks(pending.map((row) => row.id));
            }}
            options={[
              { value: 'all', label: t('fields:harvestCampaign.millKg.linkAll') },
              { value: 'pick', label: t('fields:harvestCampaign.millKg.linkPick') },
              { value: 'skip', label: t('fields:harvestCampaign.millKg.linkSkip') },
            ]}
          />
        </View>
      )}
    </HarvestSheetShell>
  );
};

const styles = StyleSheet.create({
  prompt: { fontWeight: '700', fontSize: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
