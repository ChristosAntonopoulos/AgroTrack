import React from 'react';
import { useTranslation } from 'react-i18next';
import { Cylinder } from 'lucide-react';
import { formatOilNumber, formatOilPack } from '../../myOil/formatOilPack';
import {
  groveGroupLabel,
  type GroveOilGroup,
} from '../../myOil/groupLotsByGrove';
import type { OilLot } from '../../services/oilStockService';

type PackLabels = {
  tin: (count: number, size: number) => string;
  bulk: (amount: number) => string;
  litres: (amount: number) => string;
};

type Props = {
  groups: GroveOilGroup[];
  fieldNames: Record<string, string>;
  packLabels: PackLabels;
  /** When set, highlight / scroll this grove. */
  focusFieldId?: string | null;
  onSelectGrove?: (group: GroveOilGroup) => void;
  onFillLot?: (lot: OilLot) => void;
};

export function OilByGroveSection({
  groups,
  fieldNames,
  packLabels,
  focusFieldId,
  onSelectGrove,
  onFillLot,
}: Props) {
  const { t, i18n } = useTranslation('myOil');
  if (groups.length === 0) return null;

  return (
    <section className="my-oil-by-grove" aria-labelledby="my-oil-by-grove-title">
      <header className="my-oil-by-grove__head">
        <h2 id="my-oil-by-grove-title">{t('byGrove.title')}</h2>
        <p className="my-oil-by-grove__hint">{t('byGrove.hint')}</p>
      </header>
      <ul className="my-oil-by-grove__list">
        {groups.map((group) => {
          const label = groveGroupLabel(group, fieldNames, {
            shared: (names) => t('byGrove.shared', { names }),
            unassigned: t('byGrove.unassigned'),
          });
          const focused =
            !!focusFieldId &&
            (group.primaryFieldId === focusFieldId || group.fieldIds.includes(focusFieldId));
          const free = group.available.litres;
          const fillLot =
            focused && onFillLot
              ? group.lots.find((lot) => lot.available.bulkLitres > 0.05) || null
              : null;
          return (
            <li key={group.key} className="my-oil-shelf">
              <button
                type="button"
                className={`my-oil-grove-card${focused ? ' is-focus' : ''}`}
                onClick={() => onSelectGrove?.(group)}
              >
                <span className="my-oil-grove-card__icon" aria-hidden>
                  <Cylinder size={18} strokeWidth={1.75} />
                </span>
                <span className="my-oil-grove-card__body">
                  <strong className="my-oil-grove-card__pack">
                    {free > 0.05
                      ? formatOilPack(group.available, packLabels)
                      : t('byGrove.noneFree')}
                  </strong>
                  <em className="my-oil-grove-card__where">{label}</em>
                  {free > 0.05 ? (
                    <span className="my-oil-grove-card__meta">
                      {t('litres', { amount: formatOilNumber(free, i18n.language) })}
                    </span>
                  ) : null}
                </span>
              </button>
              {fillLot ? (
                <button
                  type="button"
                  className="my-oil-linkish my-oil-shelf__fill"
                  onClick={() => onFillLot?.(fillLot)}
                >
                  {t('actions.fillTins')}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
