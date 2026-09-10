import React from 'react';
import { useTranslation } from 'react-i18next';
import type { HarvestRecord } from '../../services/harvestService';
import { formatLitres } from '../../finance/format';

type Props = {
  mode: 'litres' | 'total';
  onModeChange: (mode: 'litres' | 'total') => void;
  litres: string;
  onLitresChange: (value: string) => void;
  unitPrice: string;
  onUnitPriceChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  calculatedAmount?: string | null;
  harvests: HarvestRecord[];
  harvestId: string;
  onHarvestChange: (id: string) => void;
  availableLitres?: number | null;
  exceedsAvailable: boolean;
};

const OliveOilSaleFields: React.FC<Props> = ({
  mode,
  onModeChange,
  litres,
  onLitresChange,
  unitPrice,
  onUnitPriceChange,
  amount,
  onAmountChange,
  calculatedAmount,
  harvests,
  harvestId,
  onHarvestChange,
  availableLitres,
  exceedsAvailable,
}) => {
  const { t, i18n } = useTranslation('capture');

  return (
    <div>
      <div className="money-form-label">{t('money.oliveOilTitle')}</div>
      <div className="money-type-toggle" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'litres'} onClick={() => onModeChange('litres')}>
          {t('money.litresTimesPrice')}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'total'} onClick={() => onModeChange('total')}>
          {t('money.totalOnly')}
        </button>
      </div>

      {mode === 'litres' ? (
        <>
          <label className="money-form-label">
            {t('money.howManyLitres')}
            <input
              inputMode="decimal"
              value={litres}
              onChange={(e) => onLitresChange(e.target.value)}
              aria-label={t('money.howManyLitres')}
            />
          </label>
          <label className="money-form-label">
            {t('money.pricePerLitre')}
            <div className="money-amount-input">
              <input
                inputMode="decimal"
                value={unitPrice}
                onChange={(e) => onUnitPriceChange(e.target.value)}
                aria-label={t('money.pricePerLitre')}
              />
              <span>€/L</span>
            </div>
          </label>
          <div className="money-form-label">
            {t('money.totalAmount')}
            <div className="money-calc-value" aria-live="polite">
              {calculatedAmount || '—'} €
            </div>
          </div>
        </>
      ) : (
        <>
          <label className="money-form-label">
            {t('money.totalAmount')}
            <div className="money-amount-input">
              <input inputMode="decimal" value={amount} onChange={(e) => onAmountChange(e.target.value)} />
              <span>€</span>
            </div>
          </label>
          <button type="button" className="money-text-link" onClick={() => onModeChange('litres')}>
            {t('money.addLitresAndPrice')}
          </button>
        </>
      )}

      <label className="money-form-label">
        {t('money.fromWhichHarvest')}
        <select
          value={harvestId}
          onChange={(e) => onHarvestChange(e.target.value)}
          aria-label={t('money.relatedHarvest')}
        >
          <option value="">{t('money.noLink')}</option>
          <option value="later">{t('money.linkLater')}</option>
          {harvests.map((harvest) => (
            <option key={harvest.id} value={harvest.id}>
              {harvest.harvestDate.slice(0, 10)}
              {harvest.millName ? ` · ${harvest.millName}` : ''}
            </option>
          ))}
        </select>
      </label>
      {availableLitres != null ? (
        <p className="money-summary-note">
          {t('money.recordedAvailable', {
            quantity: formatLitres(availableLitres, i18n.language, '—'),
          })}
        </p>
      ) : null}
      {exceedsAvailable ? <p className="money-warn">{t('money.saleExceedsHarvest')}</p> : null}
    </div>
  );
};

export default OliveOilSaleFields;
