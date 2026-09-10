import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import { useCaptureOptional } from '../../context/CaptureContext';
import { formatOfficialAmount, formatOfficialNet, isForbiddenError } from '../../finance/format';
import { getFinancialSummaryService } from '../../services/serviceFactory';
import type { HarvestFinancialSummary } from '../../services/financialSummaryService';

type Props = {
  harvestId: string;
  fieldId: string;
  harvestDate?: string;
};

const HarvestMoneyPanel: React.FC<Props> = ({ harvestId, fieldId, harvestDate }) => {
  const { t, i18n } = useTranslation(['fields', 'money', 'capture']);
  const capture = useCaptureOptional();
  const [summary, setSummary] = useState<HarvestFinancialSummary | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getFinancialSummaryService()
      .getHarvestSummary(harvestId, i18n.language)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err: unknown) => {
        if (!cancelled && isForbiddenError(err)) setForbidden(true);
      });
    return () => {
      cancelled = true;
    };
  }, [harvestId, i18n.language]);

  if (forbidden) return null;

  const open = (preferredType: 'income' | 'expense') =>
    capture?.openCapture({
      preferredType,
      fieldId,
      harvestId,
      occurredAt: harvestDate,
    });

  return (
    <section className="fw-detail-section harvest-money-panel">
      <h2>{t('fields:overview.financeTitle')}</h2>
      <dl className="fw-money-facts">
        <div>
          <dt>{t('fields:overview.income')}</dt>
          <dd>
            {formatOfficialAmount(
              summary?.income,
              'EUR',
              i18n.language,
              summary?.incomeMessage || t('fields:harvestMoney.noIncome')
            )}
          </dd>
        </div>
        <div>
          <dt>{t('fields:overview.expenses')}</dt>
          <dd>
            {formatOfficialAmount(
              summary?.expenses,
              'EUR',
              i18n.language,
              t('money:unknownAmount')
            )}
          </dd>
        </div>
        <div>
          <dt>{t('fields:overview.result')}</dt>
          <dd>
            {formatOfficialNet(
              summary?.netResult,
              'EUR',
              i18n.language,
              summary?.hasRecordedIncome ? t('money:unknownAmount') : t('fields:harvestMoney.noIncome')
            )}
          </dd>
        </div>
      </dl>
      <div className="fw-card-actions">
        <Button variant="primary" size="lg" onClick={() => open('income')}>
          {t('fields:harvestMoney.addIncome')}
        </Button>
        <Button variant="outline" size="lg" onClick={() => open('expense')}>
          {t('fields:harvestMoney.addExpense')}
        </Button>
      </div>
    </section>
  );
};

export default HarvestMoneyPanel;
