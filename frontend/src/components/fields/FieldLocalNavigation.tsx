import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FIELD_PAGE_TABS, type FieldPageTab } from '../../utils/fieldPageQuery';
import type { FieldCapabilities } from '../../services/fieldPeopleService';
import './FieldPageShell.css';

type Props = {
  tab: FieldPageTab;
  onTabChange: (tab: FieldPageTab) => void;
  capabilities?: FieldCapabilities;
};

const FieldLocalNavigation: React.FC<Props> = ({ tab, onTabChange, capabilities }) => {
  const { t } = useTranslation('fields');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const labels: Record<FieldPageTab, string> = {
    overview: t('detail.overview'),
    map: t('page.mapDataShort', { defaultValue: t('page.mapData') }),
    chronologio: t('detail.timeline'),
    details: t('page.tabStatus', { defaultValue: t('page.tabDetails') }),
  };

  const titles: Record<FieldPageTab, string> = {
    overview: t('detail.overview'),
    map: t('page.mapDataFull'),
    chronologio: t('detail.timeline'),
    details: t('page.tabStatus', { defaultValue: t('page.details') }),
  };

  const tabs = FIELD_PAGE_TABS.filter((id) => {
    if (id === 'chronologio') return capabilities?.canViewChronologio ?? true;
    if (id === 'map') return capabilities?.canViewBoundary ?? true;
    return true;
  });

  const move = (current: FieldPageTab, delta: number) => {
    const index = tabs.indexOf(current);
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    onTabChange(next);
    tabRefs.current[tabs.indexOf(next)]?.focus();
  };

  return (
    <div className="field-local-nav" role="tablist" aria-label={t('page.tabsAria')}>
      {tabs.map((id, index) => {
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
            title={titles[id]}
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
                onTabChange(tabs[0]);
                tabRefs.current[0]?.focus();
              } else if (event.key === 'End') {
                event.preventDefault();
                const last = tabs[tabs.length - 1];
                onTabChange(last);
                tabRefs.current[tabs.length - 1]?.focus();
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
