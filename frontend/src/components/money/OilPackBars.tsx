import React from 'react';
import { useTranslation } from 'react-i18next';
import { fillOilPack, packLitres, setPackAmount, type OilPackStock } from '../../harvestCampaign/oilSaleLots';
import { TIN_16_LITRES, TIN_17_LITRES } from '../../harvestCampaign/utils/harvestCalculations';
import { formatGroveLitres } from '../../utils/groveTotals';

type Props = {
  stock: OilPackStock;
  value: OilPackStock;
  availableLitres: number;
  onChange: (next: OilPackStock) => void;
};

type PackRow = {
  key: keyof OilPackStock;
  label: string;
  max: number;
  current: number;
  step: number;
  chosen: string;
  has: string;
};

const OilPackBars: React.FC<Props> = ({ stock, value, availableLitres, onChange }) => {
  const { t, i18n } = useTranslation('capture');
  const language = i18n.language || 'el';
  const rows: PackRow[] = [
    stock.tin16 > 0
      ? {
          key: 'tin16',
          label: t('money.packTin16'),
          max: stock.tin16,
          current: value.tin16,
          step: 1,
          chosen: t('money.packTinValue', { count: value.tin16 }),
          has: t('money.packAvailable', { amount: t('money.packTinValue', { count: stock.tin16 }) }),
        }
      : null,
    stock.tin17 > 0
      ? {
          key: 'tin17',
          label: t('money.packTin17'),
          max: stock.tin17,
          current: value.tin17,
          step: 1,
          chosen: t('money.packTinValue', { count: value.tin17 }),
          has: t('money.packAvailable', { amount: t('money.packTinValue', { count: stock.tin17 }) }),
        }
      : null,
    stock.bulkLitres > 0
      ? {
          key: 'bulkLitres',
          label: t('money.packBulk'),
          max: stock.bulkLitres,
          current: value.bulkLitres,
          step: stock.bulkLitres >= 20 ? 1 : 0.1,
          chosen: formatGroveLitres(value.bulkLitres, language),
          has: t('money.packAvailable', { amount: formatGroveLitres(stock.bulkLitres, language) }),
        }
      : null,
  ].filter((row): row is PackRow => row != null);

  const sold = packLitres(value);
  const parts = [
    value.tin16 > 0 ? `${value.tin16} × ${TIN_16_LITRES} L` : '',
    value.tin17 > 0 ? `${value.tin17} × ${TIN_17_LITRES} L` : '',
    value.bulkLitres > 0 ? formatGroveLitres(value.bulkLitres, language) : '',
  ].filter(Boolean);

  return (
    <div className="oil-pack">
      <div className="oil-pack-tools">
        <p className="capture-hint">{t('money.packHint')}</p>
        <button type="button" className="money-quiet-link" onClick={() => onChange(fillOilPack(stock, availableLitres))}>
          {t('money.packAll')}
        </button>
      </div>
      {rows.map((row) => {
        const fill = row.max > 0 ? Math.min(100, (row.current / row.max) * 100) : 0;
        return (
          <label key={row.key} className="oil-pack-row">
            <span className="oil-pack-head">
              <span>{row.label}</span>
              <strong>{row.chosen}</strong>
            </span>
            <input
              className="oil-pack-range"
              type="range"
              min={0}
              max={row.max}
              step={row.step}
              value={row.current}
              aria-label={row.label}
              style={{ ['--fill' as string]: `${fill}%` }}
              onChange={(event) =>
                onChange(setPackAmount(value, stock, availableLitres, row.key, Number(event.target.value)))
              }
            />
            <span className="oil-pack-scale">
              <span>0</span>
              <span>{row.has}</span>
            </span>
          </label>
        );
      })}
      {sold > 0 ? (
        <p className="oil-pack-sum">
          <span>{parts.join(' + ')}</span>
          <span aria-hidden>→</span>
          <strong>{formatGroveLitres(sold, language)}</strong>
        </p>
      ) : null}
    </div>
  );
};

export default OilPackBars;
