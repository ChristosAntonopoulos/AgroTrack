import React from 'react';
import { useTranslation } from 'react-i18next';
import type { HarvestRecord } from '../../services/harvestService';
import { formatLitres } from '../../finance/format';
import { amountPlaceholderForLocale } from '../../finance/decimalEntry';
import { uniqueRelatedHarvestLabels } from '../../finance/relatedHarvestLabel';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';

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
  fieldName?: string;
  availableLitres?: number | null;
  exceedsAvailable: boolean;
  /** When false, harvest link is omitted (shown under More details). */
  showHarvestLink?: boolean;
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
  fieldName,
  availableLitres,
  exceedsAvailable,
  showHarvestLink = true,
}) => {
  const { t, i18n } = useTranslation(['capture', 'money']);
  const { dateFormat } = useLocaleFormatters();
  const harvestLabels = uniqueRelatedHarvestLabels(harvests, {
    fieldName,
    locale: i18n.language,
    dateFormat,
    statusLabel: (status) =>
      status === 'voided' ? t('money:harvestStatusVoided') : t('money:harvestStatusPosted'),
  });

  return (
    <div className="money-calc-card">
      <div className="money-calc-card__head">
        <span>{t('money.oliveOilTitle')}</span>
        {mode === 'litres' ? (
          <button type="button" className="money-quiet-link" onClick={() => onModeChange('total')}>
            {t('money.totalOnly')}
          </button>
        ) : (
          <button type="button" className="money-quiet-link" onClick={() => onModeChange('litres')}>
            {t('money.litresTimesPrice')}
          </button>
        )}
      </div>

      {mode === 'litres' ? (
        <>
          <div className="money-qty-grid">
            <label className="money-form-label">
              {t('money.howManyLitres')}
              <input
                inputMode="decimal"
                value={litres}
                onChange={(e) => onLitresChange(e.target.value)}
                aria-label={t('money.howManyLitres')}
                placeholder={amountPlaceholderForLocale(i18n.language)}
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
                  placeholder={amountPlaceholderForLocale(i18n.language)}
                />
                <span>€/L</span>
              </div>
            </label>
          </div>
          <div className="money-form-label">
            {t('money.totalAmount')}
            <div className="money-calc-value" aria-live="polite">
              {calculatedAmount || '—'} €
            </div>
          </div>
        </>
      ) : (
        <label className="money-form-label">
          {t('money.totalAmount')}
          <div className="money-amount-input">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              aria-label={t('money.totalAmount')}
              placeholder={amountPlaceholderForLocale(i18n.language)}
            />
            <span>€</span>
          </div>
        </label>
      )}

      {showHarvestLink ? (
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
                {harvestLabels.get(harvest.id) || harvest.harvestDate.slice(0, 10)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
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
