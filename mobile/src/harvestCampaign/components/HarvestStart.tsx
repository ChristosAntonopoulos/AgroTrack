import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/ui/Button';
import FieldColorMark from '../../components/fields/FieldColorMark';
import { radii, spacing } from '../../theme';
import { HarvestCard } from './HarvestCard';

export type HarvestStartField = {
  id: string;
  name: string;
  color?: string | null;
  meta?: string;
};

type Props = {
  step: 0 | 1 | 2;
  fields: HarvestStartField[];
  pickedIds: string[];
  canStart: boolean;
  startLabel: string;
  onBegin: () => void;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onContinue: () => void;
  onLater: () => void;
  onConfirm: () => void;
  onBack: () => void;
  onGoToFields: () => void;
};

const BEATS = [
  { key: 'sacks', icon: 'bag-handle-outline' as const },
  { key: 'mill', icon: 'scale-outline' as const },
  { key: 'oil', icon: 'water-outline' as const },
];

const Dots = ({ step }: { step: 1 | 2 }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.dots} accessibilityLabel={`${step} / 2`}>
      {[1, 2].map((n) => (
        <View
          key={n}
          style={[
            styles.dot,
            { backgroundColor: n <= step ? colors.eventHarvest : colors.borderLight },
          ]}
        />
      ))}
    </View>
  );
};

/** Welcoming start: a hello, then groves, then what the days will hold. */
export const HarvestStart: React.FC<Props> = ({
  step,
  fields,
  pickedIds,
  canStart,
  startLabel,
  onBegin,
  onToggle,
  onSelectAll,
  onContinue,
  onLater,
  onConfirm,
  onBack,
  onGoToFields,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const { colors, tapMin } = useTheme();

  if (step === 0) {
    return (
      <HarvestCard tone="hero" accent>
        <View style={styles.welcome}>
          <View style={[styles.mark, { backgroundColor: colors.eventHarvestSoft }]}>
            <Ionicons name="basket-outline" size={32} color={colors.eventHarvest} />
          </View>
          <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>
            {t('harvestCampaign.opening.title')}
          </Text>
          <Text style={[styles.welcomeBody, { color: colors.textSecondary }]}>
            {t('harvestCampaign.opening.body')}
          </Text>
          {canStart ? <Button title={startLabel} onPress={onBegin} fullWidth /> : null}
        </View>
      </HarvestCard>
    );
  }

  if (step === 1) {
    return (
      <View style={styles.stack}>
        <Dots step={1} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('harvestCampaign.setupTitle')}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {t('harvestCampaign.setupHint')}
        </Text>
        {fields.length === 0 ? (
          <>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {t('harvestCampaign.noFields')}
            </Text>
            <Button title={t('harvestCampaign.setup.goToFields')} onPress={onGoToFields} fullWidth />
            <Button title={t('common:back')} variant="ghost" onPress={onBack} fullWidth />
          </>
        ) : (
          <>
            {fields.map((field) => {
              const on = pickedIds.includes(field.id);
              return (
                <Pressable
                  key={field.id}
                  onPress={() => onToggle(field.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                >
                  <HarvestCard tone={on ? 'nudge' : 'default'}>
                    <View style={styles.fieldRow}>
                      <FieldColorMark color={field.color} fieldId={field.id} size={14} />
                      <View style={styles.fieldCopy}>
                        <Text style={[styles.fieldName, { color: colors.textPrimary }]}>{field.name}</Text>
                        {field.meta ? (
                          <Text style={[styles.meta, { color: colors.textSecondary }]}>{field.meta}</Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name={on ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={on ? colors.eventHarvest : colors.textTertiary}
                      />
                    </View>
                  </HarvestCard>
                </Pressable>
              );
            })}
            <Button title={t('harvestCampaign.setup.selectAll')} variant="outline" onPress={onSelectAll} fullWidth />
            <Button title={t('common:continue', { defaultValue: 'Continue' })} onPress={onContinue} fullWidth />
            <Button title={t('harvestCampaign.setup.later')} variant="ghost" onPress={onLater} fullWidth />
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <Dots step={2} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('harvestCampaign.setup.startTitle')}
      </Text>
      <View style={styles.beats}>
        {BEATS.map((beat) => (
          <View
            key={beat.key}
            style={[
              styles.beat,
              {
                backgroundColor: colors.eventHarvestSoft,
                borderColor: colors.borderLight,
                minHeight: Math.max(96, tapMin + 28),
              },
            ]}
          >
            <Ionicons name={beat.icon} size={26} color={colors.eventHarvest} />
            <Text style={[styles.beatLabel, { color: colors.textPrimary }]}>
              {t(`harvestCampaign.addMenu.title.${beat.key}`)}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {t('harvestCampaign.setup.readyLine')}
      </Text>
      <Button title={t('harvestCampaign.setup.confirmStart')} onPress={onConfirm} fullWidth />
      <Button title={t('common:back')} variant="ghost" onPress={onBack} fullWidth />
    </View>
  );
};

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  welcome: { gap: spacing.md, alignItems: 'center' },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  welcomeBody: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: spacing.xs },
  dot: { width: 22, height: 4, borderRadius: radii.full },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 22, marginBottom: spacing.xs },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldCopy: { flex: 1 },
  fieldName: { fontWeight: '700', fontSize: 16 },
  meta: { fontSize: 13, marginTop: 2 },
  beats: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  beat: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: spacing.sm,
  },
  beatLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
