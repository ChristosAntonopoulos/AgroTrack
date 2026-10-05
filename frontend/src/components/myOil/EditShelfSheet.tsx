import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Pencil, Plus } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import { HarvestNumberInput } from '../../harvestCampaign/components/HarvestNumberInput';
import { formatOilNumber } from '../../myOil/formatOilPack';
import { groveGroupLabel, type GroveOilGroup } from '../../myOil/groupLotsByGrove';
import { packLitresOf, type OilPackInput } from '../../myOil/packInput';
import type { OilLot } from '../../services/oilStockService';
import '../../harvestCampaign/HarvestSheets.css';

type Props = {
  open: boolean;
  group: GroveOilGroup | null;
  fieldNames: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onSave: (changes: { id: string; packing: OilPackInput }[]) => Promise<void>;
};

type Draft = { tin16: number; tin17: number; bulk: string };

const draftOf = (lot: OilLot): Draft => ({
  tin16: lot.packing.tin16 || 0,
  tin17: lot.packing.tin17 || 0,
  bulk: String(lot.packing.bulkLitres || 0),
});

const asPack = (draft: Draft): OilPackInput => ({
  tin16: Math.max(0, Math.round(draft.tin16 || 0)),
  tin17: Math.max(0, Math.round(draft.tin17 || 0)),
  bulkLitres: Math.max(0, Math.round((Number(draft.bulk) || 0) * 10) / 10),
});

const lotTitle = (lot: OilLot, locale: string, fallback: string) => {
  const date = new Date(lot.pressedOn);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Change the loose oil and the 16 L / 17 L tins already sitting on one shelf.
 * Bulk uses the harvest amount field. Tins use the same plus/minus cards as filling tins.
 */
export function EditShelfSheet({ open, group, fieldNames, busy, onClose, onSave }: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const locale = i18n.language;
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    if (!open || !group) return;
    const next: Record<string, Draft> = {};
    group.lots.forEach((lot) => {
      next[lot.id] = draftOf(lot);
    });
    setDrafts(next);
  }, [open, group]);

  const label = group
    ? groveGroupLabel(group, fieldNames, {
        shared: (names) => t('byGrove.shared', { names }),
        unassigned: t('byGrove.unassigned'),
      })
    : '';

  const rows = (group?.lots || []).map((lot) => {
    const draft = drafts[lot.id] || draftOf(lot);
    const pack = asPack(draft);
    const reserved = lot.reserved;
    const underReserved =
      pack.tin16 < (reserved?.tin16 || 0) ||
      pack.tin17 < (reserved?.tin17 || 0) ||
      pack.bulkLitres + 0.05 < (reserved?.bulkLitres || 0);
    const changed =
      pack.tin16 !== (lot.packing.tin16 || 0) ||
      pack.tin17 !== (lot.packing.tin17 || 0) ||
      Math.abs(pack.bulkLitres - (lot.packing.bulkLitres || 0)) > 0.05;
    return { lot, draft, pack, underReserved, changed };
  });

  const blocked = rows.some((row) => row.underReserved);
  const canSave = rows.some((row) => row.changed) && !blocked;

  const setBulk = (id: string, bulk: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { tin16: 0, tin17: 0, bulk: '0' }), bulk },
    }));
  };

  const setTin = (id: string, size: 16 | 17, count: number) => {
    const key = size === 16 ? 'tin16' : 'tin17';
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { tin16: 0, tin17: 0, bulk: '0' }), [key]: Math.max(0, count) },
    }));
  };

  return (
    <RightDrawer
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      size="md"
      title={t('byGrove.editTitle')}
      subtitle={label || t('byGrove.editHint')}
      icon={<Pencil size={18} strokeWidth={1.75} aria-hidden />}
      closeDisabled={busy}
      closeLabel={t('common:close', { defaultValue: 'Close' })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('sheet.cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={busy || !canSave}
            onClick={() =>
              void onSave(rows.filter((row) => row.changed).map((row) => ({ id: row.lot.id, packing: row.pack })))
            }
          >
            {t('byGrove.editSave')}
          </Button>
        </>
      }
    >
      <div className="my-oil-flow">
        <p className="my-oil-flow__hint">{t('byGrove.editHint')}</p>
        {rows.map(({ lot, draft, pack, underReserved }, index) => (
          <section key={lot.id} className="my-oil-shelf-edit">
            {rows.length > 1 ? (
              <p className="my-oil-flow__step">
                {lotTitle(lot, locale, t('byGrove.batch', { batch: lot.batchId }))}
              </p>
            ) : null}
            <HarvestNumberInput
              label={t('sheet.bulk')}
              value={draft.bulk}
              onChange={(value) => setBulk(lot.id, value)}
              suffix="L"
              autoFocus={index === 0}
              min={0}
            />
            <div className="my-oil-tin-grid">
              {(
                [
                  { size: 16 as const, count: draft.tin16 },
                  { size: 17 as const, count: draft.tin17 },
                ]
              ).map(({ size, count }) => (
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
                          amount: formatOilNumber(count * size, locale),
                        })}
                      </em>
                    ) : null}
                  </div>
                  <div className="my-oil-tin__controls">
                    <button
                      type="button"
                      aria-label={t('fill.lessTins', { size })}
                      onClick={() => setTin(lot.id, size, count - 1)}
                      disabled={count <= 0}
                    >
                      <Minus size={18} aria-hidden />
                    </button>
                    <strong>{count}</strong>
                    <button
                      type="button"
                      aria-label={t('fill.moreTins', { size })}
                      onClick={() => setTin(lot.id, size, count + 1)}
                    >
                      <Plus size={18} aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="my-oil-flow__total">
              {t('litres', { amount: formatOilNumber(packLitresOf(pack), locale) })}
            </p>
            {underReserved ? <p className="my-oil-give__error">{t('byGrove.editReserved')}</p> : null}
          </section>
        ))}
      </div>
    </RightDrawer>
  );
}
