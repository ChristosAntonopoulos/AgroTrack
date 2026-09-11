import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FinancialCalculationMode, FinancialQuantityUnit } from '../../finance/quantityCalculator';
import { quantityUnitLabel, UNIT_ABBREVIATION } from '../../finance/moneyUi';
import TransactionAmountInput from './TransactionAmountInput';

type Props = {
  mode: FinancialCalculationMode;
  onModeChange: (mode: FinancialCalculationMode) => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
  unit: FinancialQuantityUnit;
  units: FinancialQuantityUnit[];
  onUnitChange: (unit: FinancialQuantityUnit) => void;
  unitPrice: string;
  onUnitPriceChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  onAmountBlur?: () => void;
  calculatedAmount?: string | null;
  calculatedUnitPrice?: string | null;
  amountRef?: React.Ref<HTMLInputElement>;
};

const QuantityPriceCalculator: React.FC<Props> = ({
  mode,
  onModeChange,
  quantity,
  onQuantityChange,
  unit,
  units,
  onUnitChange,
  unitPrice,
  onUnitPriceChange,
  amount,
  onAmountChange,
  onAmountBlur,
  calculatedAmount,
  calculatedUnitPrice,
  amountRef,
}) => {
  const { t, i18n } = useTranslation('capture');
  const abbr = UNIT_ABBREVIATION[unit];

  return (
    <div>
      <div className="money-form-label">{t('money.howToEnter')}</div>
      <div className="money-type-toggle" role="tablist" aria-label={t('money.howToEnter')}>
        <button
          type="button"
          role="tab"
          aria-selected={mode !== 'total_only'}
          onClick={() => onModeChange('quantity_times_unit_price')}
        >
          {t('money.qtyTimesPrice')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'total_only'}
          onClick={() => onModeChange('total_only')}
        >
          {t('money.totalOnly')}
        </button>
      </div>

      {mode === 'total_only' ? (
        <div style={{ marginTop: 12 }}>
          <TransactionAmountInput
            value={amount}
            onChange={onAmountChange}
            onBlur={onAmountBlur}
            inputRef={amountRef}
          />
        </div>
      ) : (
        <>
          <div className="money-qty-grid" style={{ marginTop: 12 }}>
            <label className="money-form-label">
              {t('money.quantity')}
              <input
                inputMode="decimal"
                value={quantity}
                onChange={(e) => onQuantityChange(e.target.value)}
                aria-label={t('money.quantity')}
              />
            </label>
            <label className="money-form-label">
              {t('money.unit')}
              <select
                value={unit}
                onChange={(e) => onUnitChange(e.target.value as FinancialQuantityUnit)}
                aria-label={t('money.unit')}
              >
                {units.map((item) => (
                  <option key={item} value={item}>
                    {quantityUnitLabel(item, i18n.language)} ({UNIT_ABBREVIATION[item]})
                  </option>
                ))}
              </select>
            </label>
          </div>
          {mode === 'quantity_and_total' ? (
            <>
              <TransactionAmountInput
                value={amount}
                onChange={onAmountChange}
                onBlur={onAmountBlur}
                inputRef={amountRef}
              />
              <div className="money-form-label">
                {t('money.unitPrice', { unit: abbr })}
                <div className="money-calc-value" aria-live="polite">
                  {calculatedUnitPrice || '—'} €/{abbr}
                </div>
              </div>
            </>
          ) : (
            <>
              <label className="money-form-label">
                {t('money.unitPrice', { unit: abbr })}
                <div className="money-amount-input">
                  <input
                    inputMode="decimal"
                    value={unitPrice}
                    onChange={(e) => onUnitPriceChange(e.target.value)}
                    aria-label={t('money.unitPrice', { unit: abbr })}
                  />
                  <span className="money-qty-suffix">€/{abbr}</span>
                </div>
              </label>
              <div className="money-form-label">
                {t('money.total')}
                <div className="money-calc-value" aria-live="polite">
                  {calculatedAmount || '—'} €
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default QuantityPriceCalculator;
