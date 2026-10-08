import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Split } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import { useDrawerPresence } from '../../hooks/useDrawerPresence';
import { OilSectionHeader } from './OilStockChrome';
import { formatOilNumber } from '../../myOil/formatOilPack';
import type { OilPressing } from '../../services/oilStockService';

type Props = {
  pressings: OilPressing[];
  fieldNames: Record<string, string>;
  busy: boolean;
  onAllocate: (
    pressing: OilPressing,
    allocations: { cellarOwnerUserId: string; litres: number }[]
  ) => void;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const groveLine = (pressing: OilPressing, fieldNames: Record<string, string>) =>
  pressing.fieldIds.map((id) => fieldNames[id]).filter(Boolean).join(' · ');

/**
 * Oil is at the mill gate but nobody has said whose cellar it goes into — usually because a
 * partner brought the ticket in. The list stays one line per batch; the split opens in a drawer.
 */
export function OilPendingPressings({ pressings, fieldNames, busy, onAllocate }: Props) {
  const { t, i18n } = useTranslation('myOil');
  const locale = i18n.language;
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = pressings.find((p) => p.id === activeId) || null;
  const drawer = useDrawerPresence(active);

  if (pressings.length === 0) return null;

  return (
    <>
      <section className="my-oil-panel my-oil-panel--action" aria-label={t('pendingPressings.title')}>
        <OilSectionHeader
          titleKey="pendingPressings.title"
          introKey="pendingPressings.hint"
          icon={Split}
        />
        <ul className="my-oil-by-grove__list">
          {pressings.map((pressing) => {
            const groves = groveLine(pressing, fieldNames);
            return (
              <li key={pressing.id}>
                <button
                  type="button"
                  className="my-oil-grove-card"
                  onClick={() => setActiveId(pressing.id)}
                  disabled={busy}
                >
                  <span className="my-oil-grove-card__icon" aria-hidden>
                    <Split size={18} strokeWidth={1.75} />
                  </span>
                  <span className="my-oil-grove-card__body">
                    <strong>
                      {t('litres', { amount: formatOilNumber(pressing.farmerLitres, locale) })}
                    </strong>
                    <em>{groves || t('byGrove.unassigned')}</em>
                    <span className="my-oil-grove-card__meta">
                      {t('pendingPressings.batch', { batch: pressing.batchId })}
                    </span>
                  </span>
                  <span className="my-oil-pending-cta">{t('pendingPressings.distribute')}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {drawer.mounted && drawer.value ? (
        <AllocatePressingDrawer
          open={drawer.open}
          pressing={drawer.value}
          fieldNames={fieldNames}
          locale={locale}
          busy={busy}
          onClose={() => setActiveId(null)}
          onSubmit={(allocations) => {
            onAllocate(drawer.value!, allocations);
            setActiveId(null);
          }}
        />
      ) : null}
    </>
  );
}

function AllocatePressingDrawer({
  open,
  pressing,
  fieldNames,
  locale,
  busy,
  onClose,
  onSubmit}: {
  open: boolean;
  pressing: OilPressing;
  fieldNames: Record<string, string>;
  locale: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (allocations: { cellarOwnerUserId: string; litres: number }[]) => void;
}) {
  const { t } = useTranslation(['myOil', 'common']);
  const [draft, setDraft] = useState<Record<string, string>>({});

  // One tap should be enough for the common case: it is all mine unless the farmer says otherwise.
  useEffect(() => {
    if (!open) return;
    const mine =
      pressing.candidates.find((c) => c.isYou) || pressing.candidates[0] || null;
    setDraft(
      Object.fromEntries(
        pressing.candidates.map((c) => [
          c.userId,
          c.userId === mine?.userId ? String(pressing.farmerLitres) : '',
        ])
      )
    );
  }, [open, pressing.id, pressing.candidates, pressing.farmerLitres]);

  const entries = useMemo(
    () =>
      pressing.candidates.map((candidate) => ({
        candidate,
        litres: Math.max(0, Number(draft[candidate.userId]) || 0)})),
    [pressing.candidates, draft]
  );

  const taken = round1(entries.reduce((sum, e) => sum + e.litres, 0));
  const left = round1(pressing.farmerLitres - taken);
  const ready = taken > 0.05 && left >= -0.05;
  const groves = groveLine(pressing, fieldNames);

  return (
    <RightDrawer
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      size="md"
      title={t('pendingPressings.title')}
      subtitle={t('pendingPressings.batch', { batch: pressing.batchId })}
      icon={<Split size={18} strokeWidth={1.75} aria-hidden />}
      closeDisabled={busy}
      closeLabel={t('common:close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('sheet.cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={busy || !ready}
            onClick={() =>
              onSubmit(
                entries
                  .filter((e) => e.litres > 0.05)
                  .map((e) => ({ cellarOwnerUserId: e.candidate.userId, litres: e.litres }))
              )
            }
          >
            {t('pendingPressings.save')}
          </Button>
        </>
      }
    >
      <div className="my-oil-flow">
        <p className="my-oil-flow__step">
          {t('litres', { amount: formatOilNumber(pressing.farmerLitres, locale) })}
          {groves ? ` · ${groves}` : ''}
        </p>

        {pressing.candidates.map((candidate) => (
          <div className="my-oil-field" key={candidate.userId}>
            <label htmlFor={`alloc-${pressing.id}-${candidate.userId}`}>
              {candidate.isYou
                ? t('pendingPressings.you')
                : candidate.displayName || candidate.userId}
            </label>
            <input
              id={`alloc-${pressing.id}-${candidate.userId}`}
              type="number"
              min={0}
              step="0.1"
              inputMode="decimal"
              value={draft[candidate.userId] ?? ''}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, [candidate.userId]: e.target.value }))
              }
            />
          </div>
        ))}

        <p className={`my-oil-flow__step${left < -0.05 ? ' is-warn' : ''}`}>
          {left < -0.05
            ? t('pendingPressings.over', { amount: formatOilNumber(Math.abs(left), locale) })
            : t('pendingPressings.left', { amount: formatOilNumber(Math.max(0, left), locale) })}
        </p>
      </div>
    </RightDrawer>
  );
}
