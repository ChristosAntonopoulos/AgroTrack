import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Droplets } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import { HarvestNumberInput } from '../../harvestCampaign/components/HarvestNumberInput';
import { OilTinSplit, tinLitresOf } from '../../harvestCampaign/components/OilTinSplit';
import {
  formatHarvestOilAmountLabel,
  OIL_TIN_SIZES,
} from '../../harvestCampaign/utils/harvestCalculations';
import { isPositiveAmount, parseHarvestDecimal } from '../../harvestCampaign/utils/harvestValidation';
import { packFromSplit, type OilPackInput } from '../../myOil/packInput';

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (pack: OilPackInput, notes: string) => Promise<void>;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

const QUICK_LITRES = [10, 20, 50, 100];

/**
 * Add oil already in storage: the whole amount first, then the harvest tin split.
 */
export function AddOilSheet({ open, busy, onClose, onSave }: Props) {
  const { t, i18n } = useTranslation(['myOil', 'fields', 'common']);
  const locale = i18n.language;
  const [step, setStep] = useState<'amount' | 'tins'>('amount');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'all' | 'tins'>('all');
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('amount');
    setAmount('');
    setMode('all');
    setCounts({});
    setNote('');
  }, [open]);

  const litres = parseHarvestDecimal(amount);
  const total = isPositiveAmount(litres) ? litres : 0;
  const tinLitres = mode === 'tins' ? tinLitresOf(counts) : 0;
  const tinCount = OIL_TIN_SIZES.reduce((sum, size) => sum + (counts[size] || 0), 0);
  const tinOver = mode === 'tins' && tinLitres > total + 0.05;
  const packBlocked = mode === 'tins' && (tinCount <= 0 || tinOver);
  const canContinue = isPositiveAmount(litres);
  const canSave = canContinue && !packBlocked;

  const setTinCount = (size: number, count: number) => {
    setCounts((prev) => ({ ...prev, [size]: Math.max(0, count) }));
  };

  return (
    <RightDrawer
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      size="md"
      title={step === 'amount' ? t('add.title') : t('fields:harvestCampaign.oil.storedTitle')}
      subtitle={step === 'amount' ? t('add.hint') : t('add.subtitle')}
      icon={<Droplets size={18} strokeWidth={1.75} aria-hidden />}
      closeDisabled={busy}
      closeLabel={t('common:close', { defaultValue: 'Close' })}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              if (step === 'tins') setStep('amount');
              else onClose();
            }}
            disabled={busy}
          >
            {step === 'tins' ? t('common:back') : t('sheet.cancel')}
          </Button>
          {step === 'amount' ? (
            <Button variant="primary" disabled={!canContinue} onClick={() => setStep('tins')}>
              {t('common:next')}
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={busy || !canSave}
              onClick={() => void onSave(packFromSplit(total, mode, counts), note)}
            >
              {t('add.save')}
            </Button>
          )}
        </>
      }
    >
      <div className="my-oil-flow">
        {step === 'amount' ? (
          <>
            <HarvestNumberInput
              label={t('fields:harvestCampaign.oil.litres')}
              value={amount}
              onChange={setAmount}
              suffix="L"
              autoFocus
              min={0}
            />
            <div className="money-chips" role="group" aria-label={t('fields:harvestCampaign.oil.litres')}>
              {QUICK_LITRES.map((add) => (
                <button
                  key={add}
                  type="button"
                  className="money-chip"
                  onClick={() =>
                    setAmount(String(round1((parseHarvestDecimal(amount) ?? 0) + add)))
                  }
                >
                  +{add} L
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <OilTinSplit
              totalLitres={total}
              mode={mode}
              onModeChange={setMode}
              counts={counts}
              onChangeCount={setTinCount}
              locale={locale}
            />
            {tinOver ? (
              <p className="hc-oil-tin-over">
                {t('fields:harvestCampaign.oil.overTins', {
                  amount: formatHarvestOilAmountLabel(round1(tinLitres - total), 'litres', locale),
                })}
              </p>
            ) : null}
            <div className="my-oil-field">
              <label htmlFor="add-oil-note">{t('add.note')}</label>
              <input
                id="add-oil-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('add.notePlaceholder')}
              />
            </div>
          </>
        )}
      </div>
    </RightDrawer>
  );
}
