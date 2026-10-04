import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { HARVEST_ACTION_ICONS } from '../harvestActions';
import type { HarvestCampaign, HarvestCaptureKind } from '../types';
import type { Field } from '../../services/fieldService';
import { HarvestMillSheet } from '../sheets/HarvestMillSheet';
import { HarvestOilSheet } from '../sheets/HarvestOilSheet';
import { HarvestSacksSheet } from '../sheets/HarvestSacksSheet';
import type { HarvestFlowChrome } from '../sheets/types';
import { HarvestStepRail } from './HarvestStepRail';
import { radii, spacing } from '../../theme';

export type HarvestProduceStep = 'sacks' | 'mill' | 'oil';

const ORDER: HarvestProduceStep[] = ['sacks', 'mill', 'oil'];

type SackInput = { sacks: number; fieldId: string; kgPerSack?: number };
type MillInput = Parameters<React.ComponentProps<typeof HarvestMillSheet>['onSave']>[0];
type OilInput = Parameters<React.ComponentProps<typeof HarvestOilSheet>['onSave']>[0];

const isProduce = (kind: HarvestCaptureKind | undefined): kind is HarvestProduceStep =>
  kind === 'sacks' || kind === 'mill' || kind === 'oil';

export const HarvestProductionWizard: React.FC<{
  campaign: HarvestCampaign;
  fields: Field[];
  today: string;
  locale: string;
  preferredFieldId?: string;
  preferredKind?: HarvestCaptureKind;
  prefillSackIds?: string[];
  prefillMillIds?: string[];
  allowedKinds: HarvestCaptureKind[];
  onClose: () => void;
  onSaveSacks: (input: SackInput, existingId?: string) => Promise<string>;
  onSaveMill: (input: MillInput, existingId?: string) => Promise<string>;
  onSaveOil: (input: OilInput, existingId?: string) => Promise<string>;
  onOther: (kind: HarvestCaptureKind) => void;
}> = ({
  campaign,
  fields,
  today,
  locale,
  preferredFieldId,
  preferredKind,
  prefillSackIds,
  prefillMillIds,
  allowedKinds,
  onClose,
  onSaveSacks,
  onSaveMill,
  onSaveOil,
  onOther,
}) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin } = useTheme();
  const enabled = ORDER.filter((step) => allowedKinds.includes(step));
  const others = allowedKinds.filter((kind) => !isProduce(kind));
  const [step, setStep] = useState<HarvestProduceStep>(() => {
    if (isProduce(preferredKind) && enabled.includes(preferredKind)) return preferredKind;
    return enabled[0] ?? 'sacks';
  });
  const [busy, setBusy] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [extraSackIds, setExtraSackIds] = useState<string[]>([]);
  const [extraMillIds, setExtraMillIds] = useState<string[]>([]);
  const busyRef = useRef(false);
  const sackIdRef = useRef<string | null>(null);
  const millIdRef = useRef<string | null>(null);
  const oilIdRef = useRef<string | null>(null);
  const pending = useRef<HarvestProduceStep | null>(null);
  const gates = useRef<Partial<Record<HarvestProduceStep, () => boolean>>>({});

  const bindSacks = useCallback((fn: () => boolean) => {
    gates.current.sacks = fn;
  }, []);
  const bindMill = useCallback((fn: () => boolean) => {
    gates.current.mill = fn;
  }, []);
  const bindOil = useCallback((fn: () => boolean) => {
    gates.current.oil = fn;
  }, []);

  const nextOf = (from: HarvestProduceStep) => {
    const index = enabled.indexOf(from);
    return index >= 0 ? enabled[index + 1] ?? null : null;
  };

  const prevOf = (from: HarvestProduceStep) => {
    const index = enabled.indexOf(from);
    return index > 0 ? enabled[index - 1] : null;
  };

  const go = (next: HarvestProduceStep) => {
    if (busy || next === step || !enabled.includes(next)) return;
    const forward = enabled.indexOf(next) > enabled.indexOf(step);
    if (!forward) {
      setStep(next);
      return;
    }
    pending.current = next;
    const started = gates.current[step]?.() ?? false;
    if (!started) {
      pending.current = null;
      setStep(next);
    }
  };

  const afterSave = (from: HarvestProduceStep) => {
    const next = pending.current ?? nextOf(from);
    pending.current = null;
    if (next && enabled.includes(next) && next !== from) {
      setStep(next);
      return;
    }
    onClose();
  };

  const run = async (from: HarvestProduceStep, work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await work();
      afterSave(from);
    } finally {
      pending.current = null;
      busyRef.current = false;
      setBusy(false);
    }
  };

  const flowFor = (
    current: HarvestProduceStep,
    bind: HarvestFlowChrome['bind']
  ): HarvestFlowChrome => ({
    nextLabel: nextOf(current) ? t('harvestCampaign.wizard.next') : t('harvestCampaign.wizard.done'),
    backLabel: t('harvestCampaign.wizard.back'),
    onBack: prevOf(current) ? () => setStep(prevOf(current)!) : undefined,
    busy,
    active: step === current,
    bind,
  });

  const millPrefill = [...new Set([...(prefillSackIds ?? []), ...extraSackIds])];
  const oilPrefill = [...new Set([...(prefillMillIds ?? []), ...extraMillIds])];

  return (
    <View style={styles.wizard}>
      <HarvestStepRail
        current={step}
        enabled={enabled}
        onPick={busy ? undefined : (next) => go(next)}
      />
      {others.length > 0 ? (
        <Pressable onPress={() => setShowOther((open) => !open)}>
          <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
            {t('harvestCampaign.wizard.other')}
          </Text>
        </Pressable>
      ) : null}
      {showOther ? (
        <View style={styles.otherList}>
          {others.map((kind) => (
            <Pressable
              key={kind}
              onPress={() => onOther(kind)}
              style={[styles.otherRow, { borderColor: colors.border, minHeight: tapMin }]}
            >
              <Ionicons name={HARVEST_ACTION_ICONS[kind]} size={16} color={colors.textPrimary} />
              <Text style={{ color: colors.textPrimary }}>{t(`harvestCampaign.actions.${kind}`)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {enabled.includes('sacks') ? (
        <View style={step === 'sacks' ? styles.step : styles.hidden}>
          <HarvestSacksSheet
            campaign={campaign}
            fields={fields}
            today={today}
            locale={locale}
            preferredFieldId={preferredFieldId}
            flow={flowFor('sacks', bindSacks)}
            onClose={onClose}
            onSave={(input) => {
              void run('sacks', async () => {
                const id = await onSaveSacks(input, sackIdRef.current || undefined);
                sackIdRef.current = id;
                setExtraSackIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
              });
            }}
          />
        </View>
      ) : null}
      {enabled.includes('mill') ? (
        <View style={step === 'mill' ? styles.step : styles.hidden}>
          <HarvestMillSheet
            campaign={campaign}
            fields={fields}
            today={today}
            locale={locale}
            preferredFieldId={preferredFieldId}
            prefillSackIds={millPrefill}
            flow={flowFor('mill', bindMill)}
            onClose={onClose}
            onSave={(input) => {
              void run('mill', async () => {
                const id = await onSaveMill(input, millIdRef.current || undefined);
                millIdRef.current = id;
                setExtraMillIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
              });
            }}
          />
        </View>
      ) : null}
      {enabled.includes('oil') ? (
        <View style={step === 'oil' ? styles.step : styles.hidden}>
          <HarvestOilSheet
            campaign={campaign}
            fields={fields}
            today={today}
            locale={locale}
            preferredFieldId={preferredFieldId}
            prefillMillIds={oilPrefill}
            flow={flowFor('oil', bindOil)}
            onClose={onClose}
            onSave={(input) => {
              void run('oil', async () => {
                const id = await onSaveOil(input, oilIdRef.current || undefined);
                oilIdRef.current = id;
              });
            }}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wizard: { flex: 1, minHeight: 0, gap: spacing.md },
  step: { flex: 1, minHeight: 0 },
  otherList: { gap: 8 },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
  },
  hidden: { display: 'none' },
});
