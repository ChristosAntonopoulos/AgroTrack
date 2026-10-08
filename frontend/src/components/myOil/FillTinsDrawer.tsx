import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Package, Plus, Sprout, Warehouse } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import { formatOilNumber } from '../../myOil/formatOilPack';
import type { OilLot } from '../../services/oilStockService';

type Props = {
  open: boolean;
  lots: OilLot[];
  preferredLot?: OilLot | null;
  fieldNames?: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onSave: (lotId: string, add16: number, add17: number) => Promise<void>;
};

type Step = 'source' | 'fill';

const AUTO_SOURCE = '__auto__';

export function FillTinsDrawer({
  open,
  lots,
  preferredLot,
  fieldNames = {},
  busy,
  onClose,
  onSave}: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const locale = i18n.language;

  const withBulk = useMemo(
    () =>
      [...lots]
        .filter((l) => l.packing.bulkLitres > 0.05)
        .sort((a, b) => new Date(a.pressedOn).getTime() - new Date(b.pressedOn).getTime()),
    [lots]
  );

  const [step, setStep] = useState<Step>('source');
  const [sourceKey, setSourceKey] = useState<string>(AUTO_SOURCE);
  const [add16, setAdd16] = useState(0);
  const [add17, setAdd17] = useState(0);

  useEffect(() => {
    if (!open) return;
    setAdd16(0);
    setAdd17(0);
    if (preferredLot && preferredLot.packing.bulkLitres > 0.05) {
      setSourceKey(preferredLot.id);
      setStep('fill');
    } else {
      setSourceKey(AUTO_SOURCE);
      setStep(withBulk.length > 1 ? 'source' : 'fill');
    }
  }, [open, preferredLot, withBulk.length]);

  const linkedLots = withBulk.filter((l) => (l.harvestRecordIds?.length || 0) > 0);
  const unlinkedLots = withBulk.filter((l) => !(l.harvestRecordIds?.length > 0));

  const resolvedLot = useMemo(() => {
    if (sourceKey === AUTO_SOURCE) return withBulk[0] || null;
    return withBulk.find((l) => l.id === sourceKey) || withBulk[0] || null;
  }, [sourceKey, withBulk]);

  const bulk = resolvedLot?.packing.bulkLitres || 0;
  const used = add16 * 16 + add17 * 17;
  const left = Math.round((bulk - used) * 10) / 10;
  const canSave = !!resolvedLot && used > 0 && left >= -0.05;
  const wantsHarvestLink = sourceKey !== AUTO_SOURCE;

  const formatLotDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const fieldLabel = (lot: OilLot) => {
    const names = lot.fieldIds.map((id) => fieldNames[id]).filter(Boolean);
    if (!names.length) return null;
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1}`;
  };

  const footer =
    withBulk.length === 0 ? (
      <Button variant="secondary" onClick={onClose} disabled={busy}>
        {t('fill.cancel')}
      </Button>
    ) : step === 'source' ? (
      <>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {t('fill.cancel')}
        </Button>
        <Button
          variant="primary"
          disabled={!resolvedLot}
          onClick={() => {
            setAdd16(0);
            setAdd17(0);
            setStep('fill');
          }}
        >
          {t('fill.continue')}
        </Button>
      </>
    ) : (
      <>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            if (preferredLot && withBulk.length <= 1) onClose();
            else setStep('source');
          }}
        >
          {withBulk.length > 1 || !preferredLot ? t('fill.back') : t('fill.cancel')}
        </Button>
        <Button
          variant="primary"
          disabled={busy || !canSave}
          onClick={() => resolvedLot && void onSave(resolvedLot.id, add16, add17)}
        >
          {t('fill.save')}
        </Button>
      </>
    );

  return (
    <RightDrawer
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      size="md"
      title={t('fill.title')}
      subtitle={
        step === 'source'
          ? t('fill.sourceSubtitle')
          : wantsHarvestLink
            ? t('fill.linkedSubtitle')
            : t('fill.unlinkedSubtitle')
      }
      icon={<Package size={18} strokeWidth={1.75} aria-hidden />}
      closeDisabled={busy}
      closeLabel={t('common:close')}
      footer={footer}
    >
      <div className="my-oil-flow">
        {withBulk.length === 0 ? (
          <p className="my-oil-empty__body">{t('fill.noBulk')}</p>
        ) : step === 'source' ? (
          <>
            <p className="my-oil-flow__step">{t('fill.chooseSource')}</p>

            <button
              type="button"
              className={`my-oil-source-card${sourceKey === AUTO_SOURCE ? ' is-on' : ''}`}
              onClick={() => setSourceKey(AUTO_SOURCE)}
            >
              <span className="my-oil-source-card__icon" aria-hidden>
                <Warehouse size={18} strokeWidth={1.7} />
              </span>
              <span className="my-oil-source-card__body">
                <strong>{t('fill.autoTitle')}</strong>
                <em>{t('fill.autoBody')}</em>
              </span>
            </button>

            {linkedLots.length > 0 ? (
              <>
                <p className="my-oil-flow__step">{t('fill.fromHarvest')}</p>
                <ul className="my-oil-source-list">
                  {linkedLots.map((lot) => {
                    const where = fieldLabel(lot);
                    return (
                      <li key={lot.id}>
                        <button
                          type="button"
                          className={`my-oil-source-card${sourceKey === lot.id ? ' is-on' : ''}`}
                          onClick={() => setSourceKey(lot.id)}
                        >
                          <span className="my-oil-source-card__icon" aria-hidden>
                            <Sprout size={18} strokeWidth={1.7} />
                          </span>
                          <span className="my-oil-source-card__body">
                            <strong>{formatLotDate(lot.pressedOn)}</strong>
                            {where ? <em>{where}</em> : null}
                            <span className="my-oil-source-card__meta">
                              {t('fill.bulkChip', {
                                amount: formatOilNumber(lot.packing.bulkLitres, locale)})}
                              {' · '}
                              {t('fill.harvestLinked')}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}

            {unlinkedLots.length > 0 ? (
              <>
                <p className="my-oil-flow__step">{t('fill.otherLots')}</p>
                <ul className="my-oil-source-list">
                  {unlinkedLots.map((lot) => {
                    const where = fieldLabel(lot);
                    return (
                      <li key={lot.id}>
                        <button
                          type="button"
                          className={`my-oil-source-card${sourceKey === lot.id ? ' is-on' : ''}`}
                          onClick={() => setSourceKey(lot.id)}
                        >
                          <span className="my-oil-source-card__icon" aria-hidden>
                            <Package size={18} strokeWidth={1.7} />
                          </span>
                          <span className="my-oil-source-card__body">
                            <strong>{formatLotDate(lot.pressedOn)}</strong>
                            {where ? <em>{where}</em> : null}
                            <span className="my-oil-source-card__meta">
                              {t('fill.bulkChip', {
                                amount: formatOilNumber(lot.packing.bulkLitres, locale)})}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}
          </>
        ) : (
          <>
            {resolvedLot ? (
              <div className="my-oil-fill-source">
                <span className="my-oil-source-card__icon" aria-hidden>
                  {wantsHarvestLink ? (
                    <Sprout size={18} strokeWidth={1.7} />
                  ) : (
                    <Warehouse size={18} strokeWidth={1.7} />
                  )}
                </span>
                <span className="my-oil-source-card__body">
                  <strong>
                    {wantsHarvestLink ? formatLotDate(resolvedLot.pressedOn) : t('fill.autoTitle')}
                  </strong>
                  {wantsHarvestLink && fieldLabel(resolvedLot) ? <em>{fieldLabel(resolvedLot)}</em> : null}
                </span>
              </div>
            ) : null}

            <dl className="my-oil-fill-balance" aria-live="polite">
              <div>
                <dt>{t('fill.balanceAvailable')}</dt>
                <dd>
                  {formatOilNumber(bulk, locale)}
                  <span>{t('fill.unitLitres')}</span>
                </dd>
              </div>
              <div className={used > 0 ? 'is-on' : ''}>
                <dt>{t('fill.balanceUsed')}</dt>
                <dd>
                  {formatOilNumber(used, locale)}
                  <span>{t('fill.unitLitres')}</span>
                </dd>
              </div>
              <div>
                <dt>{t('fill.balanceLeft')}</dt>
                <dd>
                  {formatOilNumber(Math.max(0, left), locale)}
                  <span>{t('fill.unitLitres')}</span>
                </dd>
              </div>
            </dl>

            <p className="my-oil-flow__step">{t('fill.what')}</p>
            <div className="my-oil-tin-grid">
              {(
                [
                  { size: 16, count: add16, setCount: setAdd16 },
                  { size: 17, count: add17, setCount: setAdd17 },
                ] as const
              ).map(({ size, count, setCount }) => (
                <div key={size} className={`my-oil-tin${count > 0 ? ' is-on' : ''}`}>
                  <div className="my-oil-tin__size">
                    <strong>{size}</strong>
                    <span>{t('fill.unitLitres')}</span>
                  </div>
                  <div className="my-oil-tin__copy">
                    <span>{t('fill.tinName')}</span>
                    {count > 0 ? (
                      <em>
                        {t('fill.tinSubtotal', {
                          amount: formatOilNumber(count * size, locale)})}
                      </em>
                    ) : null}
                  </div>
                  <div className="my-oil-tin__controls">
                    <button
                      type="button"
                      aria-label={t('fill.lessTins', { size })}
                      onClick={() => setCount((n) => Math.max(0, n - 1))}
                      disabled={count <= 0}
                    >
                      <Minus size={18} aria-hidden />
                    </button>
                    <strong>{count}</strong>
                    <button
                      type="button"
                      aria-label={t('fill.moreTins', { size })}
                      onClick={() => setCount((n) => n + 1)}
                      disabled={left - size < -0.05}
                    >
                      <Plus size={18} aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {used === 0 ? <p className="my-oil-flow__hint">{t('fill.pickHint')}</p> : null}
          </>
        )}
      </div>
    </RightDrawer>
  );
}
