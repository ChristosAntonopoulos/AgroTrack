import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FIELD_PAGE_TABS, type FieldPageTab } from '../../utils/fieldPageQuery';
import './FieldPageShell.css';

type Props = {
  tab: FieldPageTab;
  onTabChange: (tab: FieldPageTab) => void;
};

const FieldLocalNavigation: React.FC<Props> = ({ tab, onTabChange }) => {
  const { t } = useTranslation('fields');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const labels: Record<FieldPageTab, string> = {
    overview: t('detail.overview'),
    map: t('page.mapData'),
    chronologio: t('detail.timeline'),
    details: t('page.details'),
  };

  const move = (current: FieldPageTab, delta: number) => {
    const index = FIELD_PAGE_TABS.indexOf(current);
    const next = FIELD_PAGE_TABS[(index + delta + FIELD_PAGE_TABS.length) % FIELD_PAGE_TABS.length];
    onTabChange(next);
    tabRefs.current[FIELD_PAGE_TABS.indexOf(next)]?.focus();
  };

  return (
    <div className="field-local-nav" role="tablist" aria-label={t('page.tabsAria')}>
      {FIELD_PAGE_TABS.map((id, index) => {
        const selected = tab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`field-tab-${id}`}
            aria-selected={selected}
            aria-controls={`field-panel-${id}`}
            tabIndex={selected ? 0 : -1}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            className={selected ? 'is-active' : undefined}
            onClick={() => onTabChange(id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                move(id, 1);
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                move(id, -1);
              } else if (event.key === 'Home') {
                event.preventDefault();
                onTabChange(FIELD_PAGE_TABS[0]);
                tabRefs.current[0]?.focus();
              } else if (event.key === 'End') {
                event.preventDefault();
                const last = FIELD_PAGE_TABS[FIELD_PAGE_TABS.length - 1];
                onTabChange(last);
                tabRefs.current[FIELD_PAGE_TABS.length - 1]?.focus();
              }
            }}
          >
            {labels[id]}
          </button>
        );
      })}
    </div>
  );
};

export default FieldLocalNavigation;
