import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import { Handshake } from 'lucide-react';
import {
  ServiceCategory,
  categoryName,
  childCategories,
  parentCategories,
} from '../../services/partnerService';
import { categoryIcon } from './categoryIcons';
import PartnersSheet from './PartnersSheet';

type Props = {
  categories: ServiceCategory[];
  disabled: boolean;
  onPick: (category: ServiceCategory) => void;
};

const NeedHelpSection: React.FC<Props> = ({ categories, disabled, onPick }) => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const [showAll, setShowAll] = useState(false);
  const [pickedParent, setPickedParent] = useState<ServiceCategory | null>(null);

  const parents = useMemo(() => parentCategories(categories), [categories]);
  const prominent = parents.filter((c) => c.isProminent);
  const extra = parents.filter((c) => !c.isProminent);
  const visible = showAll ? [...prominent, ...extra] : prominent;

  const onParentClick = (category: ServiceCategory) => {
    const children = childCategories(categories, category.id);
    if (children.length === 0) {
      onPick(category);
      return;
    }
    setPickedParent(category);
  };

  return (
    <section className="partners-section partners-section--help" id="need-help">
      <div className="partners-section-head">
        <div>
          <h2>{t('partners:needHelpSection')}</h2>
          <p className="partners-lead">{t('partners:needWhat')}</p>
        </div>
      </div>

      {disabled ? (
        <p className="partners-inline-hint" role="status">
          {t('partners:needField')}
        </p>
      ) : null}

      <div className={`partners-grid ${disabled ? 'is-disabled' : ''}`}>
        {visible.map((category) => (
          <button
            key={category.id}
            type="button"
            className="partner-cat-card"
            disabled={disabled}
            onClick={() => onParentClick(category)}
          >
            <span className="partner-cat-icon">{categoryIcon(category.icon)}</span>
            <span>{categoryName(category, i18n.language)}</span>
          </button>
        ))}
        {extra.length > 0 && (
          <button
            type="button"
            className="partner-cat-card partner-cat-card--muted"
            disabled={disabled}
            onClick={() => setShowAll((v) => !v)}
          >
            <span className="partner-cat-icon">
              <Handshake size={28} />
            </span>
            <span>{showAll ? t('partners:hideExtra') : t('partners:showAll')}</span>
          </button>
        )}
      </div>

      {pickedParent ? (
        <PartnersSheet
          title={categoryName(pickedParent, i18n.language)}
          subtitle={t('partners:pickSubservice')}
          onClose={() => setPickedParent(null)}
          footer={
            <Button variant="ghost" onClick={() => setPickedParent(null)}>
              {t('common:cancel')}
            </Button>
          }
        >
          <div className="partners-subservice-list">
            <button type="button" className="partners-subservice-item partners-subservice-item--all" onClick={() => onPick(pickedParent)}>
              {t('partners:allInCategory')}
            </button>
            {childCategories(categories, pickedParent.id).map((child) => (
              <button
                key={child.id}
                type="button"
                className="partners-subservice-item"
                onClick={() => onPick(child)}
              >
                {categoryName(child, i18n.language)}
              </button>
            ))}
          </div>
        </PartnersSheet>
      ) : null}
    </section>
  );
};

export default NeedHelpSection;
