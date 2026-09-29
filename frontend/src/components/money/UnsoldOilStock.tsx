import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatLitres } from '../../finance/format';
import { harvestYearSpan } from '../../finance/harvestYear';
import {
  groupUnsoldOil,
  sumUnsoldOil,
  type UnsoldOilLot,
} from '../../finance/unsoldOilStock';
import './Money.css';

type Props = {
  year: number;
  lots: UnsoldOilLot[];
  fieldNames: Record<string, string>;
  locale: string;
};

const formatWhen = (date: string, locale: string): string => {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
};

const packLabel = (
  lot: Pick<UnsoldOilLot, 'tin16' | 'tin17' | 'bulkLitres' | 'litres'>,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string
): string => {
  const bits: string[] = [];
  if (lot.tin16 > 0) bits.push(t('unsoldTin', { count: lot.tin16, size: 16 }));
  if (lot.tin17 > 0) bits.push(t('unsoldTin', { count: lot.tin17, size: 17 }));
  if (lot.bulkLitres > 0.05 && (lot.tin16 > 0 || lot.tin17 > 0)) {
    bits.push(t('unsoldBulk', { amount: formatLitres(lot.bulkLitres, locale, '—') }));
  }
  if (bits.length === 0) return formatLitres(lot.litres, locale, '—');
  return bits.join(' · ');
};

const LotList: React.FC<{
  lots: UnsoldOilLot[];
  fieldNames: Record<string, string>;
  locale: string;
  pack: (lot: Pick<UnsoldOilLot, 'tin16' | 'tin17' | 'bulkLitres' | 'litres'>) => string;
}> = ({ lots, fieldNames, locale, pack }) => (
  <ul className="money-stock-list">
    {lots.map((lot) => {
      const where = lot.fieldIds
        .map((id) => fieldNames[id])
        .filter(Boolean)
        .join(' · ');
      return (
        <li key={lot.id} className="money-stock-lot">
          <div className="money-stock-lot__when">
            <span>{formatWhen(lot.date, locale)}</span>
            {where ? <span className="money-stock-lot__where">{where}</span> : null}
          </div>
          <span className="money-stock-lot__pack">{pack(lot)}</span>
        </li>
      );
    })}
  </ul>
);

const UnsoldOilStock: React.FC<Props> = ({ year, lots, fieldNames, locale }) => {
  const { t } = useTranslation('money');
  if (lots.length === 0) return null;

  const totals = sumUnsoldOil(lots);
  const { thisYear, otherYears } = groupUnsoldOil(lots, year);
  const showGroups = thisYear.length > 0 && otherYears.length > 0;
  const showPack = totals.tin16 > 0 || totals.tin17 > 0;
  const pack = (lot: Pick<UnsoldOilLot, 'tin16' | 'tin17' | 'bulkLitres' | 'litres'>) =>
    packLabel(lot, t, locale);

  return (
    <section className="money-card money-stock" aria-label={t('unsoldTitle')}>
      <header className="money-stock-head">
        <div>
          <h2>{t('unsoldTitle')}</h2>
          <p className="money-stock-kicker">{t('unsoldHint')}</p>
        </div>
        <p className="money-stock-total">{formatLitres(totals.litres, locale, '—')}</p>
      </header>
      {showPack ? <p className="money-stock-pack">{pack({ ...totals, litres: totals.litres })}</p> : null}
      {thisYear.length > 0 ? (
        <div className="money-stock-group">
          {showGroups ? <h3>{t('unsoldThisYear')}</h3> : null}
          <LotList lots={thisYear} fieldNames={fieldNames} locale={locale} pack={pack} />
        </div>
      ) : null}
      {otherYears.map((group) => (
        <div key={group.harvestYear} className="money-stock-group">
          <h3>{t('unsoldYear', { span: harvestYearSpan(group.harvestYear) })}</h3>
          <LotList lots={group.lots} fieldNames={fieldNames} locale={locale} pack={pack} />
        </div>
      ))}
    </section>
  );
};

export default UnsoldOilStock;
