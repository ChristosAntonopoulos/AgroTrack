import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

type Props = {
  children: React.ReactNode;
  /** When false, render nothing (no empty attention chrome). */
  show: boolean;
};

/** One banner for share asks, pending mill splits, and pickup holds. */
export function OilAttentionBlock({ children, show }: Props) {
  const { t } = useTranslation('myOil');
  if (!show) return null;
  return (
    <section className="my-oil-attention" aria-labelledby="my-oil-attention-title">
      <header className="my-oil-attention__head">
        <AlertTriangle size={14} strokeWidth={1.75} aria-hidden />
        <h2 id="my-oil-attention-title">{t('attention.title')}</h2>
      </header>
      <div className="my-oil-attention__body">{children}</div>
    </section>
  );
}
