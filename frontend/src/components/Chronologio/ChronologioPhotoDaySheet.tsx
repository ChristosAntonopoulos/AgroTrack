import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioEntry } from '../../services/chronologioService';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { collectChronologioImages } from '../../utils/chronologioPhotoGroups';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import PhotoLightbox, { type PhotoLightboxItem } from '../photos/PhotoLightbox';
import { usePhotoLightbox } from '../photos/usePhotoLightbox';
import ChronologioDetailShell from './ChronologioDetailShell';
import ChronologioCategoryIcon from './ChronologioCategoryIcon';

type Props = {
  open: boolean;
  entries: ChronologioEntry[];
  onClose: () => void;
};

/** Same-day photo collage detail — side drawer (matches note / expense peeks). */
const ChronologioPhotoDaySheet: React.FC<Props> = ({ open, entries, onClose }) => {
  const { t, i18n } = useTranslation(['photos', 'chronologio']);
  const lightbox = usePhotoLightbox();

  const items: PhotoLightboxItem[] = useMemo(() => {
    return collectChronologioImages(entries).map((m) => {
      const full = resolvePublicAssetUrl(m.url || m.thumbnailUrl) || m.url || m.thumbnailUrl || '';
      const thumb =
        resolvePublicAssetUrl(m.thumbnailUrl || m.url) || m.thumbnailUrl || m.url || full;
      return { id: m.id || full, src: full, thumbnailSrc: thumb, alt: t('photos:detail.title') };
    });
  }, [entries, t]);

  const when = entries[0]?.occurredAt
    ? new Date(entries[0].occurredAt).toLocaleDateString(i18n.language, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : undefined;

  const fieldNames = [
    ...new Set(entries.map((e) => e.field?.name).filter((name): name is string => Boolean(name))),
  ];
  const fieldName = fieldNames.length === 1 ? friendlyFieldLabel(fieldNames[0]) : undefined;
  const fieldColor =
    fieldNames.length === 1
      ? resolveFieldColor(entries[0]?.field?.color, entries[0]?.fieldId)
      : undefined;

  const resetKey = entries.map((e) => e.id).join('|') || 'photo-day';

  return (
    <>
      <ChronologioDetailShell
        open={open && entries.length > 0}
        onClose={onClose}
        resetKey={resetKey}
        title={t('photos:dayStack.sheetTitle')}
        categoryLabel={t('chronologio:categoryLabel.photo', { defaultValue: 'Photo' })}
        categoryIcon={<ChronologioCategoryIcon category="photo" size={18} />}
        accent="observation"
        when={when}
        fieldName={fieldName}
        fieldColor={fieldColor}
      >
        <p className="chrono-peek-sub chrono-photo-day-count">
          {t('photos:dayStack.count', { count: items.length || entries.length })}
        </p>
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
      </ChronologioDetailShell>
      <PhotoLightbox
        open={lightbox.open}
        items={lightbox.items}
        index={lightbox.index}
        onClose={lightbox.close}
        onIndexChange={lightbox.setIndex}
      />
    </>
  );
};

export default ChronologioPhotoDaySheet;
