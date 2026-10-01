import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import { formatLitres } from '../../finance/format';
import type { OilStockSummary } from '../../services/oilStockService';
import './Money.css';

type Props = {
  summary: OilStockSummary;
  locale: string;
};

/** Cellar snapshot for Money: out vs still there, then one path to storage. */
const UnsoldOilStock: React.FC<Props> = ({ summary, locale }) => {
  const { t } = useTranslation(['money', 'myOil']);

  const remaining = Math.max(0, summary.onHand?.litres || 0);
  const gone = Math.max(0, summary.delivered?.litres || 0);
  const gross = remaining + gone;
  if (gross < 0.05) return null;

  const remainingPct = Math.round((remaining / gross) * 100);
  const gonePct = 100 - remainingPct;

  return (
    <section className="money-card money-stock" aria-label={t('unsoldTitle')}>
      <header className="money-stock-head">
        <div>
          <h2>{t('unsoldTitle')}</h2>
          <p className="money-stock-kicker">{t('unsoldHint')}</p>
        </div>
      </header>

      <div
        className="money-stock-meter"
        role="img"
        aria-label={t('unsoldMeterAria', {
          remaining: formatLitres(remaining, locale, '—'),
          gone: formatLitres(gone, locale, '—'),
        })}
      >
        <div className="money-stock-meter__bar" aria-hidden>
          <span className="money-stock-meter__gone" style={{ flexGrow: Math.max(gonePct, gone > 0 ? 1 : 0) }} />
          <span
            className="money-stock-meter__rest"
            style={{ flexGrow: Math.max(remainingPct, remaining > 0 ? 1 : 0) }}
          />
        </div>
        <ul className="money-stock-meter__legend">
          <li className="money-stock-meter__row money-stock-meter__row--gone">
            <span className="money-stock-meter__label">{t('unsoldSoldGiven')}</span>
            <strong className="money-stock-meter__amount">{formatLitres(gone, locale, '—')}</strong>
          </li>
          <li className="money-stock-meter__row money-stock-meter__row--rest">
            <span className="money-stock-meter__label">{t('remaining')}</span>
            <strong className="money-stock-meter__amount">
              {formatLitres(remaining, locale, '—')}
            </strong>
          </li>
        </ul>
      </div>

      <Button as={Link} to="/my-oil" variant="secondary" fullWidth>
        {t('myOil:seeMyOil')}
      </Button>
    </section>
  );
};

export default UnsoldOilStock;
