import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { HARVEST_ACTION_ICONS } from '../harvestActions';
import type { HarvestCampaign, HarvestCaptureKind } from '../types';
import type { Field } from '../../services/fieldService';
import { HarvestMillSheet } from '../sheets/HarvestMillSheet';
import { HarvestOilSheet } from '../sheets/HarvestOilSheet';
import { HarvestSacksSheet } from '../sheets/HarvestSacksSheet';
import type { HarvestFlowChrome } from '../sheets/types';

export type HarvestProduceStep = 'sacks' | 'mill' | 'oil';

const ORDER: HarvestProduceStep[] = ['sacks', 'mill', 'oil'];

type SackInput = { sacks: number; fieldId: string; kgPerSack?: number };
type MillInput = Parameters<React.ComponentProps<typeof HarvestMillSheet>['onSave']>[0];
type OilInput = Parameters<React.ComponentProps<typeof HarvestOilSheet>['onSave']>[0];

const isProduce = (kind: HarvestCaptureKind | undefined): kind is HarvestProduceStep =>
  kind === 'sacks' || kind === 'mill' || kind === 'oil';

/**
 * One form: σάκοι, then ελαιόκαρπος, then λάδι.
 * The drawer stays open. Moving forward saves the step so the next one is already linked.
 * Moving back keeps what was typed.
 */
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
    if (next && enabled.includes(next)) setStep(next);
    else onClose();
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
  const stepIndex = enabled.indexOf(step);

  return (
    <div className="hc-wizard">
      <div className="hc-wizard-nav" role="tablist" aria-label={t('harvestCampaign.stepRail.aria')}>
        {enabled.map((item, index) => {
          const done = stepIndex > index;
          const on = item === step;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={on}
              className={`hc-wizard-step${on ? ' is-on' : ''}${done ? ' is-done' : ''}`}
              disabled={busy}
              onClick={() => go(item)}
            >
              <span className="hc-wizard-num" aria-hidden>
                {done ? <Check size={14} strokeWidth={2.6} /> : index + 1}
              </span>
              <span className="hc-wizard-label">{t(`harvestCampaign.addMenu.title.${item}`)}</span>
            </button>
          );
        })}
      </div>
      {others.length > 0 ? (
        <button type="button" className="hc-wizard-other" onClick={() => setShowOther((open) => !open)}>
          {t('harvestCampaign.wizard.other')}
        </button>
      ) : null}
      {showOther ? (
        <div className="hc-wizard-other-list">
          {others.map((kind) => {
            const Icon = HARVEST_ACTION_ICONS[kind];
            return (
              <button key={kind} type="button" onClick={() => onOther(kind)}>
                <Icon size={16} aria-hidden />
                {t(`harvestCampaign.actions.${kind}`)}
              </button>
            );
          })}
        </div>
      ) : null}

      {enabled.includes('sacks') ? (
        <div className={`hc-wizard-pane${step === 'sacks' ? ' is-on' : ' is-hidden'}`} role="tabpanel">
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
        </div>
      ) : null}
      {enabled.includes('mill') ? (
        <div className={`hc-wizard-pane${step === 'mill' ? ' is-on' : ' is-hidden'}`} role="tabpanel">
          <HarvestMillSheet
            campaign={campaign}
            fields={fields}
            today={today}
            locale={locale}
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
        </div>
      ) : null}
      {enabled.includes('oil') ? (
        <div className={`hc-wizard-pane${step === 'oil' ? ' is-on' : ' is-hidden'}`} role="tabpanel">
          <HarvestOilSheet
            campaign={campaign}
            fields={fields}
            today={today}
            locale={locale}
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
        </div>
      ) : null}
    </div>
  );
};
