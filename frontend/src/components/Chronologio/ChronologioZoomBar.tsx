import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioZoom } from '../../chronologio/livingTypes';
import { ZOOM_DISPLAY_ORDER } from '../../chronologio/livingTypes';

type Props = {
  zoom: ChronologioZoom;
  onSetZoom: (z: ChronologioZoom) => void;
};

/** Segmented semantic zoom only — no +/- (levels are explicit). */
const ChronologioZoomBar: React.FC<Props> = ({ zoom, onSetZoom }) => {
  const { t } = useTranslation('chronologio');

  return (
    <div className="chrono-zoom-bar" role="toolbar" aria-label={t('living.zoomLabel')}>
      <div className="chrono-zoom-levels">
        {ZOOM_DISPLAY_ORDER.map((level) => (
          <button
            key={level}
            type="button"
            className={`chrono-zoom-level${zoom === level ? ' is-active' : ''}`}
            onClick={() => onSetZoom(level)}
            aria-pressed={zoom === level}
          >
            {t(`living.zoom.${level}`)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChronologioZoomBar;
