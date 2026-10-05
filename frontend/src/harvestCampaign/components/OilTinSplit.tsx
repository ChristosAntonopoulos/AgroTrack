import React from 'react';
import { useTranslation } from 'react-i18next';
import { HarvestNumberStepper } from './HarvestNumberInput';
import { HarvestSegmentedControl } from './HarvestSegmentedControl';
import {
  formatHarvestOilAmountLabel,
  OIL_TIN_SIZES,
} from '../utils/harvestCalculations';
import '../HarvestSheets.css';
import '../../components/money/Money.css';

const round1 = (value: number) => Math.round(value * 10) / 10;

export const tinLitresOf = (counts: Record<number, number>) =>
  OIL_TIN_SIZES.reduce((sum, size) => sum + size * Math.max(0, counts[size] || 0), 0);

type Mode = 'all' | 'tins';

/**
 * Split a known amount of oil into loose bulk or tins.
 * Same control the harvest oil form uses: tap a size to add one tin, then adjust the count.
 */
export function OilTinSplit({
  totalLitres,
  mode,
  onModeChange,
  counts,
  onChangeCount,
  locale,
}: {
  totalLitres: number;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  counts: Record<number, number>;
  onChangeCount: (size: number, count: number) => void;
  locale: string;
}) {
  const { t } = useTranslation('fields');
  const packed = mode === 'tins' ? counts : {};
  const tinLitres = tinLitresOf(packed);
  const bulkLitres = Math.max(0, round1(totalLitres - tinLitres));
  const tinOver = mode === 'tins' && tinLitres > totalLitres + 0.05;
  const tinShare = totalLitres > 0 ? Math.min(100, (tinLitres / totalLitres) * 100) : 0;
  const tinCount = OIL_TIN_SIZES.reduce((sum, size) => sum + (packed[size] || 0), 0);

  return (
    <div className="hc-oil-tin-split">
      <div>
        <div className="hc-oil-split-bar" aria-hidden>
          {tinShare > 0 ? (
            <span
              data-part="tin16"
              style={{
                width: `${tinOver ? 100 : tinShare}%`,
                background: tinOver ? 'var(--status-danger, #c45c4a)' : undefined,
              }}
            />
          ) : null}
        </div>
        <div className="hc-oil-tin-legend">
          <span>
            {t('harvestCampaign.oil.part.bulk')}{' '}
            {formatHarvestOilAmountLabel(mode === 'tins' ? bulkLitres : totalLitres, 'litres', locale)}
          </span>
          {mode === 'tins' && tinLitres > 0 ? (
            <span>
              {t('harvestCampaign.oil.storedTins')}{' '}
              {formatHarvestOilAmountLabel(round1(tinLitres), 'litres', locale)}
            </span>
          ) : null}
        </div>
      </div>
      <HarvestSegmentedControl
        value={mode}
        ariaLabel={t('harvestCampaign.oil.storedTitle')}
        onChange={onModeChange}
        options={[
          { value: 'all', label: t('harvestCampaign.oil.part.bulk') },
          { value: 'tins', label: t('harvestCampaign.oil.storedTins') },
        ]}
      />
      {mode === 'tins' ? (
        <div className="hc-oil-tin-rows">
          <p className="hc-oil-step-title">{t('harvestCampaign.oil.tinTypeTitle')}</p>
          <p className="my-oil-flow__hint">{t('harvestCampaign.oil.tapTinAdd')}</p>
          <div className="hc-oil-tin-chips" role="group" aria-label={t('harvestCampaign.oil.tinTypeTitle')}>
            {OIL_TIN_SIZES.map((size) => {
              const count = counts[size] || 0;
              const on = count > 0;
              return (
                <button
                  key={size}
                  type="button"
                  className={`hc-oil-tin-chip${on ? ' is-on' : ''}`}
                  aria-label={`+1 ${size} L`}
                  onClick={() => onChangeCount(size, count + 1)}
                >
                  {size} L
                  {on ? <small>×{count}</small> : null}
                </button>
              );
            })}
          </div>
          {tinCount > 0 ? (
            OIL_TIN_SIZES.filter((size) => (counts[size] || 0) > 0).map((size) => (
              <HarvestNumberStepper
                key={size}
                label={`${size} L`}
                value={counts[size] || 0}
                onChange={(next) => onChangeCount(size, Math.round(next))}
                min={0}
                suffix={t('harvestCampaign.oil.tinSuffix')}
              />
            ))
          ) : (
            <p className="my-oil-flow__hint">{t('harvestCampaign.oil.tinCountHint')}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
