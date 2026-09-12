import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { ChronologioEntry } from '../../services/chronologioService';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { collectChronologioImages } from '../../utils/chronologioPhotoGroups';
import { useDrawerDialog } from '../../hooks/useDrawerDialog';
import PhotoLightbox, { type PhotoLightboxItem } from '../photos/PhotoLightbox';
import { usePhotoLightbox } from '../photos/usePhotoLightbox';

type Props = {
  open: boolean;
  entries: ChronologioEntry[];
  onClose: () => void;
};

/** Sheet/popup listing same-day photos; tapping one opens the shared lightbox. */
const ChronologioPhotoDaySheet: React.FC<Props> = ({ open, entries, onClose }) => {
  const { t, i18n } = useTranslation(['photos', 'chronologio']);
  const { headingId, headingRef, panelRef } = useDrawerDialog({ open, onClose });
  const lightbox = usePhotoLightbox();

  const items: PhotoLightboxItem[] = useMemo(() => {
    return collectChronologioImages(entries).map((m) => {
      const full = resolvePublicAssetUrl(m.url || m.thumbnailUrl) || m.url || m.thumbnailUrl || '';
      const thumb =
        resolvePublicAssetUrl(m.thumbnailUrl || m.url) || m.thumbnailUrl || m.url || full;
      return { id: m.id || full, src: full, thumbnailSrc: thumb, alt: t('photos:detail.title') };
    });
  }, [entries, t]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {open ? (
        <button
          type="button"
          className="chrono-photo-day-backdrop"
          tabIndex={-1}
          aria-hidden="true"
          onClick={onClose}
        />
      ) : null}
      {open ? (
        <aside
          ref={panelRef as React.RefObject<HTMLElement>}
          className="chrono-photo-day-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
        >
          <header className="chrono-photo-day-head">
            <div>
              <h2 id={headingId} ref={headingRef} className="chrono-photo-day-title">
                {t('photos:dayStack.sheetTitle')}
              </h2>
              <p className="chrono-photo-day-sub">
                {t('photos:dayStack.count', { count: items.length || entries.length })}
                {entries[0]?.occurredAt
                  ? ` · ${new Date(entries[0].occurredAt).toLocaleDateString(i18n.language, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              className="chrono-photo-day-close"
              onClick={onClose}
              aria-label={t('photos:viewer.close')}
            >
              <X size={18} aria-hidden />
            </button>
          </header>
          <div className="chrono-photo-day-grid">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="chrono-photo-day-tile"
                onClick={() => lightbox.openAt(items, index)}
              >
                <img src={item.thumbnailSrc || item.src} alt={item.alt || ''} loading="lazy" />
              </button>
            ))}
          </div>
        </aside>
      ) : null}
      <PhotoLightbox
        open={lightbox.open}
        items={lightbox.items}
        index={lightbox.index}
        onClose={lightbox.close}
        onIndexChange={lightbox.setIndex}
      />
    </>,
    document.body
  );
};

export default ChronologioPhotoDaySheet;
