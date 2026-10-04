import React from 'react';
import { useTranslation } from 'react-i18next';

export function OilStockPageHeader({ season }: { season: string }) {
  const { t } = useTranslation('myOil');
  return (
    <header className="my-oil-header">
      <div>
        <h1 className="my-oil-title">{t('title')}</h1>
        <p className="my-oil-support">{t('pageSupport')}</p>
      </div>
      <div className="my-oil-season-badge">
        <span className="my-oil-season">{t('seasonLabel', { season })}</span>
      </div>
    </header>
  );
}

export function OilSectionHeader({
  titleKey,
  introKey,
  icon: Icon,
}: {
  titleKey: string;
  introKey?: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean }>;
}) {
  const { t } = useTranslation('myOil');
  return (
    <div className="my-oil-section-head">
      <h2 className="my-oil-panel__title">
        {Icon ? <Icon size={14} strokeWidth={1.75} aria-hidden className="my-oil-section-head__icon" /> : null}
        {t(titleKey)}
      </h2>
      {introKey ? <p className="my-oil-section-intro">{t(introKey)}</p> : null}
    </div>
  );
}
