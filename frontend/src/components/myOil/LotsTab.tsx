import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layers } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import { formatOilNumber, formatOilPack } from '../../myOil/formatOilPack';
import { packHasType } from './OilOverviewSections';
import { OilSectionHeader } from './OilStockChrome';
import { useDrawerPresence } from '../../hooks/useDrawerPresence';
import type { OilLot } from '../../services/oilStockService';
import type { PackFilter } from '../../myOil/commitmentCopy';

type PackLabels = {
  tin: (count: number, size: number) => string;
  bulk: (amount: number) => string;
  litres: (amount: number) => string;
};

type Props = {
  lots: OilLot[];
  fieldNames: Record<string, string>;
  packLabels: PackLabels;
  packFilter?: PackFilter;
  busy: boolean;
  formatDate: (iso: string) => string;
  onFill: (lot: OilLot) => void;
  onAdjust: (lot: OilLot, kind: string) => void;
  preview?: boolean;
  onSeeAll?: () => void;
};

export function LotsTab({
  lots,
  fieldNames,
  packLabels,
  packFilter = 'all',
  busy,
  formatDate,
  onFill,
  onAdjust,
  preview,
  onSeeAll,
}: Props) {
  const { t, i18n } = useTranslation('myOil');
  const [detail, setDetail] = useState<OilLot | null>(null);
  const detailDrawer = useDrawerPresence(detail);
  const locale = i18n.language;

  const filtered = useMemo(() => {
    if (packFilter === 'all') return lots;
    return lots.filter((lot) => packHasType(lot.packing, packFilter === 'bulk' ? 'bulk' : packFilter));
  }, [lots, packFilter]);

  const shown = preview ? filtered.slice(0, 3) : filtered;

  if (lots.length === 0) {
    return (
      <section className="my-oil-panel">
        <div className="my-oil-empty">
          <p className="my-oil-empty__title">{t('lots.emptyTitle')}</p>
          <p className="my-oil-empty__body">{t('lots.emptyBody')}</p>
          <div style={{ marginTop: '0.75rem' }}>
            <Link to="/harvest">
              <Button variant="primary">{t('lots.emptyCta')}</Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const activeLot = detailDrawer.value;

  return (
    <div>
      {preview ? (
        <OilSectionHeader titleKey="lots.previewTitle" icon={Layers} />
      ) : (
        <OilSectionHeader titleKey="lots.title" icon={Layers} />
      )}
      <ul className="my-oil-lot-list">
        {shown.map((lot) => {
          const names = lot.fieldIds.map((id) => fieldNames[id]).filter(Boolean);
          const where = names[0] || null;
          const extra = names.length > 1 ? names.length - 1 : 0;
          return (
            <li key={lot.id} className="my-oil-lot-card">
              <LotCardArt />
              <div className="my-oil-lot-card__when">{formatDate(lot.pressedOn)}</div>
              {where ? (
                <div className="my-oil-lot-card__where">
                  {where}
                  {extra > 0 ? (
                    <span className="my-oil-lot-card__more">
                      {' '}
                      {t('lots.moreFields', { count: extra })}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="my-oil-lot-card__pack">{formatOilPack(lot.packing, packLabels)}</div>
              <div className="my-oil-lot-card__meta">
                {t('lots.totalLitres', {
                  amount: formatOilNumber(lot.packing.litres || lot.farmerLitres, locale),
                })}
              </div>
              <div className="my-oil-lot-card__actions">
                <Button variant="secondary" size="sm" onClick={() => setDetail(lot)}>
                  {t('lots.seeLot')}
                </Button>
                {lot.packing.bulkLitres > 0.05 ? (
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => onFill(lot)}>
                    {t('lots.fillTins')}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {preview && onSeeAll ? (
        <button type="button" className="my-oil-linkish" onClick={onSeeAll}>
          {t('lots.seeAll')}
        </button>
      ) : null}

      {detailDrawer.mounted && activeLot ? (
        <LotDetailDrawer
          open={detailDrawer.open}
          lot={activeLot}
          fieldNames={fieldNames}
          packLabels={packLabels}
          formatDate={formatDate}
          onClose={() => setDetail(null)}
          onFill={() => {
            setDetail(null);
            onFill(activeLot);
          }}
          onAdjust={(kind) => {
            setDetail(null);
            onAdjust(activeLot, kind);
          }}
        />
      ) : null}
    </div>
  );
}

/** Tiny shelf/tin motif — decorative, does not compete with content. */
function LotCardArt() {
  return (
    <svg className="my-oil-lot-card__art" viewBox="0 0 48 40" fill="none" aria-hidden>
      <rect x="6" y="12" width="12" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="20" y="8" width="14" height="22" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="36" y="14" width="8" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 34h40" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
    </svg>
  );
}

function LotDetailDrawer({
  open,
  lot,
  fieldNames,
  packLabels,
  formatDate,
  onClose,
  onFill,
  onAdjust,
}: {
  open: boolean;
  lot: OilLot;
  fieldNames: Record<string, string>;
  packLabels: PackLabels;
  formatDate: (iso: string) => string;
  onClose: () => void;
  onFill: () => void;
  onAdjust: (kind: string) => void;
}) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const locale = i18n.language;
  const names = lot.fieldIds.map((id) => fieldNames[id]).filter(Boolean);
  const gone = lot.reserved;
  const hasBulk = lot.packing.bulkLitres > 0.05;

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      size="md"
      title={formatDate(lot.pressedOn)}
      subtitle={names.length ? names.join(' · ') : undefined}
      icon={<Layers size={18} strokeWidth={1.75} aria-hidden />}
      closeLabel={t('common:close', { defaultValue: 'Κλείσιμο' })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          {hasBulk ? (
            <Button variant="primary" onClick={onFill}>
              {t('lots.fillTins')}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="my-oil-give">
        <p className="my-oil-give__step">{t('lots.detail.oil')}</p>
        <p className="my-oil-waiting__pack">
          {t('lots.detail.totalOil', {
            amount: formatOilNumber(lot.farmerLitres + (lot.millKept || 0), locale),
          })}
        </p>
        {lot.millKept > 0 ? (
          <p className="my-oil-waiting__story">
            {t('lots.detail.millKept', { amount: formatOilNumber(lot.millKept, locale) })}
          </p>
        ) : null}
        <p className="my-oil-waiting__story">
          {t('lots.detail.farmerTook', { amount: formatOilNumber(lot.farmerLitres, locale) })}
        </p>

        <p className="my-oil-give__step">{t('lots.detail.now')}</p>
        <p className="my-oil-waiting__pack">{formatOilPack(lot.packing, packLabels)}</p>

        {gone.tin16 + gone.tin17 + gone.bulkLitres > 0.05 ? (
          <>
            <p className="my-oil-give__step">{t('lots.detail.gone')}</p>
            <p className="my-oil-waiting__pack">{formatOilPack(gone, packLabels)}</p>
          </>
        ) : null}

        <div className="my-oil-lot-detail__links">
          <button type="button" className="my-oil-linkish" onClick={() => onAdjust('correction')}>
            {t('lots.overflow.correct')}
          </button>
          <button type="button" className="my-oil-linkish" onClick={() => onAdjust('home_use')}>
            {t('lots.overflow.consume')}
          </button>
        </div>
      </div>
    </RightDrawer>
  );
}
