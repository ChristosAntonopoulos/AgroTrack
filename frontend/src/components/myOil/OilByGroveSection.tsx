import React from 'react';
import { useTranslation } from 'react-i18next';
import { Cylinder, Droplets, Package, Pencil, Trees } from 'lucide-react';
import { formatOilNumber } from '../../myOil/formatOilPack';
import { groveGroupLabel, type GroveOilGroup } from '../../myOil/groupLotsByGrove';
import type { OilLot } from '../../services/oilStockService';

type Props = {
  groups: GroveOilGroup[];
  fieldNames: Record<string, string>;
  focusFieldId?: string | null;
  onEdit: (group: GroveOilGroup) => void;
  onFillLot?: (lot: OilLot) => void;
};

export function OilByGroveSection({
  groups,
  fieldNames,
  focusFieldId,
  onEdit,
  onFillLot,
}: Props) {
  const { t, i18n } = useTranslation('myOil');
  const locale = i18n.language;
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
          const fillLot =
            focused && onFillLot
              ? group.lots.find((lot) => lot.available.bulkLitres > 0.05) || null
              : null;
          const onHand = group.onHand;
          const rows = [
            {
              key: 'bulk',
              icon: <Droplets size={14} strokeWidth={1.75} aria-hidden />,
              label: t('warehouse.packBulk'),
              value: `${formatOilNumber(onHand.bulkLitres, locale)} L`,
            },
            {
              key: '16',
              icon: <Cylinder size={14} strokeWidth={1.75} aria-hidden />,
              label: t('warehouse.pack16'),
              value: t('hero.tinCount', {
                count: onHand.tin16,
                litres: formatOilNumber(onHand.tin16 * 16, locale),
              }),
            },
            {
              key: '17',
              icon: <Package size={14} strokeWidth={1.75} aria-hidden />,
              label: t('warehouse.pack17'),
              value: t('hero.tinCount', {
                count: onHand.tin17,
                litres: formatOilNumber(onHand.tin17 * 17, locale),
              }),
            },
          ];
          return (
            <li key={group.key} className="my-oil-shelf">
              <article className={`my-oil-grove-card${focused ? ' is-focus' : ''}`}>
                <div className="my-oil-grove-card__top">
                  <span className="my-oil-grove-card__icon" aria-hidden>
                    <Trees size={18} strokeWidth={1.75} />
                  </span>
                  <span className="my-oil-grove-card__body">
                    <strong className="my-oil-grove-card__pack">{label}</strong>
                    <span className="my-oil-grove-card__meta">
                      {t('litres', { amount: formatOilNumber(onHand.litres, locale) })}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="my-oil-grove-card__edit"
                    onClick={() => onEdit(group)}
                  >
                    <Pencil size={13} strokeWidth={1.8} aria-hidden />
                    {t('byGrove.edit')}
                  </button>
                </div>
                <ul className="my-oil-shelf-mix">
                  {rows.map((row) => (
                    <li key={row.key}>
                      {row.icon}
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </li>
                  ))}
                </ul>
              </article>
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
