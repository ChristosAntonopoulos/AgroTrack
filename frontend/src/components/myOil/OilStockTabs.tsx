import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Bookmark, Warehouse, type LucideIcon } from 'lucide-react';
import type { OilStockTab } from '../../myOil/commitmentCopy';

const TABS: { id: OilStockTab; Icon: LucideIcon }[] = [
  { id: 'stock', Icon: Warehouse },
  { id: 'holds', Icon: Bookmark },
  { id: 'movements', Icon: Activity },
];

type Props = {
  active: OilStockTab;
  onChange: (tab: OilStockTab) => void;
  /** Number badge per tab, e.g. open holds. */
  counts?: Partial<Record<OilStockTab, number>>;
};

export function OilStockTabs({ active, onChange, counts }: Props) {
  const { t } = useTranslation('myOil');
  return (
    <div className="my-oil-tabs" role="tablist" aria-label={t('title')}>
      {TABS.map(({ id, Icon }) => {
        const count = counts?.[id] || 0;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            className={active === id ? 'is-on' : ''}
            onClick={() => onChange(id)}
          >
            <Icon size={14} strokeWidth={1.75} aria-hidden />
            {t(`tabs.${id}`)}
            {count > 0 ? <span className="my-oil-tabs__count">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
