import React from 'react';
import { useTranslation } from 'react-i18next';
import { yearGlanceSlots } from '../../chronologio/timelineRail';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { formatGroveMassKg } from '../../utils/groveTotals';

type Props = {
  oilKg: number;
  oliveKg: number;
  expenseTotal: number;
  currency: string;
  recordCount: number;
  numberLocale: string;
};

const ChronologioGlanceFacts: React.FC<Props> = ({
  oilKg,
  oliveKg,
  expenseTotal,
  currency,
  recordCount,
  numberLocale,
}) => {
  const { t } = useTranslation('chronologio');
  const slots = yearGlanceSlots({ oilKg, oliveKg, expenseTotal, recordCount });
  if (slots.length === 0) return null;

  const fact = (slot: (typeof slots)[number]) => {
    if (slot === 'oil') {
      return {
        label: t('timeline.glanceOil'),
        value: `${formatGroveMassKg(oilKg, numberLocale)} ${t('oilUnit')}`,
      };
    }
    if (slot === 'olives') {
      return {
        label: t('timeline.glanceOlives'),
        value: `${formatGroveMassKg(oliveKg, numberLocale)} ${t('olivesUnit')}`,
      };
    }
    if (slot === 'expenses') {
      return {
        label: t('timeline.glanceExpenses'),
        value: formatChronologioMoney(expenseTotal, currency, numberLocale),
      };
    }
    return {
      label: t('timeline.glanceRecords'),
      value: t('timeline.entryCount', { count: recordCount }),
    };
  };

  return (
    <dl className="chrono-glance-facts">
      {slots.map((slot) => {
        const row = fact(slot);
        return (
          <div key={slot}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        );
      })}
    </dl>
  );
};

export default ChronologioGlanceFacts;
