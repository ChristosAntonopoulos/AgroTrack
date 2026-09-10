import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldFinancialResult } from '../../services/financialSummaryService';
import { UNASSIGNED_FIELD_QUERY } from '../../finance/buildYearSummary';
import { formatOfficialAmount, formatOfficialNet } from '../../finance/format';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import './Money.css';

type Props = {
  rows: FieldFinancialResult[];
  currency: string;
  locale: string;
  showPerHectare: boolean;
  fieldNames: Record<string, string>;
  onSelectField: (fieldId: string) => void;
};

const MoneyFieldRows: React.FC<Props> = ({
  rows,
  currency,
  locale,
  showPerHectare,
  fieldNames,
  onSelectField,
}) => {
  const { t } = useTranslation('money');
  const unknown = t('unknownAmount');
  if (!rows.length) return null;

  return (
    <section className="money-card">
      <h2>{t('byField')}</h2>
      <div className="money-field-table">
        {rows.map((row) => {
          const id = row.isUnassigned ? UNASSIGNED_FIELD_QUERY : row.fieldId || '';
          const name = row.isUnassigned
            ? row.fieldName
            : fieldNames[row.fieldId || ''] || friendlyFieldLabel(row.fieldName);
          const resultClass =
            row.netResult == null ? '' : row.netResult < 0 ? ' is-loss' : row.netResult > 0 ? ' is-profit' : '';
          return (
            <button
              key={id || 'unassigned'}
              type="button"
              className="money-field-item"
              onClick={() => onSelectField(id)}
            >
              <div>
                <strong>{name}</strong>
                <p>
                  {t('income')} {formatOfficialAmount(row.income, currency, locale, unknown)}
                  {' · '}
                  {t('expenses')} {formatOfficialAmount(row.expenses, currency, locale, unknown)}
                </p>
              </div>
              <span className={`money-field-result${resultClass}`}>
                {formatOfficialNet(row.netResult, currency, locale, unknown)}
              </span>
              <span>
                {showPerHectare && row.costPerHectare != null
                  ? `${t('costPerHectare')} ${formatOfficialAmount(row.costPerHectare, currency, locale, unknown)}`
                  : t('openField')}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default MoneyFieldRows;
