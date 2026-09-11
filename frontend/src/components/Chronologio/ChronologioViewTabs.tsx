import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  VIEW_ORDER,
  VIEW_PANEL_ID,
  type ChronologioView,
} from '../../chronologio/livingTypes';

type Props = {
  view: ChronologioView;
  onChange: (view: ChronologioView) => void;
};

const ChronologioViewTabs: React.FC<Props> = ({ view, onChange }) => {
  const { t } = useTranslation('chronologio');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusView = (index: number) => {
    const next = VIEW_ORDER[index];
    if (!next) return;
    tabRefs.current[index]?.focus();
    onChange(next);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = VIEW_ORDER.indexOf(view);
    if (current < 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusView((current + 1) % VIEW_ORDER.length);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusView((current - 1 + VIEW_ORDER.length) % VIEW_ORDER.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusView(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusView(VIEW_ORDER.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onChange(view);
    }
  };

  return (
    <div
      className="chrono-view-tabs"
      role="tablist"
      aria-label={t('living.zoomLabel')}
      onKeyDown={onKeyDown}
    >
      {VIEW_ORDER.map((id, index) => {
        const selected = id === view;
        return (
          <button
            key={id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`chrono-tab-${id}`}
            aria-selected={selected}
            aria-controls={VIEW_PANEL_ID[id]}
            tabIndex={selected ? 0 : -1}
            className={`chrono-view-tab${selected ? ' is-active' : ''}`}
            onClick={() => onChange(id)}
          >
            {t(`living.views.${id}`)}
          </button>
        );
      })}
    </div>
  );
};

export default ChronologioViewTabs;
