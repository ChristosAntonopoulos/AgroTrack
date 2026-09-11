import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, FilePenLine, LayoutGrid, TrendingDown, TrendingUp } from 'lucide-react';
import './Money.css';

type KindFilter = 'all' | 'income' | 'expense' | 'draft';

type Props = {
  year: number;
  kind: KindFilter;
  hideIncome?: boolean;
  onYearChange: (year: number) => void;
  onKindChange: (kind: KindFilter) => void;
};

const MoneyContextBar: React.FC<Props> = ({
  year,
  kind,
  hideIncome,
  onYearChange,
  onKindChange,
}) => {
  const { t } = useTranslation('money');
  const kinds: Array<{ id: KindFilter; icon: React.ReactNode; label: string }> = [
    { id: 'all', icon: <LayoutGrid size={18} aria-hidden />, label: t('kindAll') },
    ...(!hideIncome
      ? [{ id: 'income' as const, icon: <TrendingUp size={18} aria-hidden />, label: t('kindIncome') }]
      : []),
    { id: 'expense', icon: <TrendingDown size={18} aria-hidden />, label: t('kindExpenses') },
    { id: 'draft', icon: <FilePenLine size={18} aria-hidden />, label: t('kindDrafts') },
  ];

  return (
    <div className="money-toolbar">
      <div className="money-year-tabs" role="group" aria-label={t('yearAria')}>
        <button type="button" aria-label={t('prevYear')} onClick={() => onYearChange(year - 1)}>
          <ChevronLeft size={20} />
        </button>
        <strong aria-live="polite">{year}</strong>
        <button type="button" aria-label={t('nextYear')} onClick={() => onYearChange(year + 1)}>
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="money-kind-rail" role="tablist" aria-label={t('entries')}>
        {kinds.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={kind === item.id}
            className={`money-kind-chip${kind === item.id ? ' is-selected' : ''}`}
            onClick={() => onKindChange(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MoneyContextBar;
