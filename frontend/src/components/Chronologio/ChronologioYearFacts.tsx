import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import type { YearChapterFact } from '../../chronologio/yearPresentation';

type Props = {
  facts: YearChapterFact[];
  numberLocale: string;
};

const ChronologioYearFacts: React.FC<Props> = ({ facts, numberLocale }) => {
  const { t } = useTranslation('chronologio');
  if (facts.length === 0) return null;

  return (
    <ul className="chrono-year-chapter-facts">
      {facts.map((fact) => {
        const text =
          fact.kind === 'work'
            ? t('monthView.workShort', { count: fact.count })
            : fact.kind === 'notes'
              ? t('monthView.notesShort', { count: fact.count })
              : fact.kind === 'money'
                ? t('monthView.expensesShort', {
                    amount: formatChronologioMoney(fact.amount, fact.currency, numberLocale),
                  })
                : fact.kind === 'olives'
                  ? t('yearView.olivesFact', {
                      kg: Math.round(fact.kg).toLocaleString(numberLocale),
                    })
                  : t('yearView.recordsFact', { count: fact.count });
        return <li key={fact.kind}>{text}</li>;
      })}
    </ul>
  );
};

export default ChronologioYearFacts;
