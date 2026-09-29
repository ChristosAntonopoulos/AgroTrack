import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Bookmark, Layers, Activity } from 'lucide-react';
import type { OilStockTab } from '../../myOil/commitmentCopy';

const TABS: { id: OilStockTab; Icon: typeof LayoutDashboard }[] = [
  { id: 'overview', Icon: LayoutDashboard },
  { id: 'others', Icon: Bookmark },
  { id: 'lots', Icon: Layers },
  { id: 'movements', Icon: Activity },
];

type Props = {
  active: OilStockTab;
  onChange: (tab: OilStockTab) => void;
};

export function OilStockTabs({ active, onChange }: Props) {
  const { t } = useTranslation('myOil');
  return (
    <div className="my-oil-tabs" role="tablist" aria-label={t('title')}>
      {TABS.map(({ id, Icon }) => (
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
        </button>
      ))}
    </div>
  );
}
