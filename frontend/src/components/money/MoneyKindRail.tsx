import React from 'react';
import { useTranslation } from 'react-i18next';
import { FilePenLine, LayoutGrid, TrendingDown, TrendingUp } from 'lucide-react';
import './Money.css';

export type MoneyKindFilter = 'all' | 'income' | 'expense' | 'draft';

type Props = {
  kind: MoneyKindFilter;
  hideIncome?: boolean;
  onKindChange: (kind: MoneyKindFilter) => void;
};

const MoneyKindRail: React.FC<Props> = ({ kind, hideIncome, onKindChange }) => {
  const { t } = useTranslation('money');
  const kinds: Array<{ id: MoneyKindFilter; icon: React.ReactNode; label: string }> = [
    { id: 'all', icon: <LayoutGrid size={16} aria-hidden />, label: t('kindAll') },
    ...(!hideIncome
      ? [{ id: 'income' as const, icon: <TrendingUp size={16} aria-hidden />, label: t('kindIncome') }]
      : []),
    { id: 'expense', icon: <TrendingDown size={16} aria-hidden />, label: t('kindExpenses') },
    { id: 'draft', icon: <FilePenLine size={16} aria-hidden />, label: t('kindDrafts') },
  ];

  return (
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
  );
};

export default MoneyKindRail;
