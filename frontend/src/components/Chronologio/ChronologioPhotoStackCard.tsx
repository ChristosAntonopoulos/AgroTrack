import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react';
import type { ChronologioEntry } from '../../services/chronologioService';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { collectChronologioImages } from '../../utils/chronologioPhotoGroups';
import ChronologioThumbnail from './ChronologioThumbnail';

type Props = {
  entries: ChronologioEntry[];
  selected?: boolean;
  showField?: boolean;
  onOpen: () => void;
};

/** Same-day Photo Hub collage card for the Chronologio journal grid. */
const ChronologioPhotoStackCard: React.FC<Props> = ({
  entries,
  selected = false,
  showField = false,
  onOpen,
}) => {
  const { t, i18n } = useTranslation(['photos', 'chronologio']);
  const images = useMemo(() => collectChronologioImages(entries), [entries]);
  const thumbs = images.slice(0, 4).map((m) => {
    const raw = m.thumbnailUrl || m.url || '';
    return resolvePublicAssetUrl(raw) || raw;
  });
  const count = Math.max(images.length, entries.length);
  const fieldNames = showField
    ? [...new Set(entries.map((e) => e.field?.name).filter(Boolean))]
    : [];
  const time = (() => {
    const d = new Date(entries[0]?.occurredAt || '');
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  })();

  const collageClass =
    thumbs.length >= 4
      ? 'is-quad'
      : thumbs.length === 3
        ? 'is-tri'
        : thumbs.length === 2
          ? 'is-duo'
          : 'is-single';

  return (
    <button
      type="button"
      className={`chrono-photo-stack${selected ? ' is-selected' : ''}`}
      onClick={onOpen}
      aria-label={t('photos:dayStack.openSheet', { defaultValue: 'Open photos' })}
    >
      <div className={`chrono-photo-stack-collage ${collageClass}`} aria-hidden>
        {thumbs.length ? (
          thumbs.map((src, i) => (
            <ChronologioThumbnail key={`${src}-${i}`} src={src} className="chrono-photo-stack-cell" />
          ))
        ) : (
          <span className="chrono-photo-stack-fallback">
            <Camera size={28} />
          </span>
        )}
        {count > 4 ? <span className="chrono-photo-stack-more">+{count - 4}</span> : null}
      </div>
      <div className="chrono-photo-stack-meta">
        <span className="chrono-photo-stack-kicker">
          <Camera size={14} aria-hidden />
          {t('photos:dayStack.title')}
        </span>
        <span className="chrono-photo-stack-title">{t('photos:dayStack.count', { count })}</span>
        <span className="chrono-photo-stack-sub">
          {[time, fieldNames.join(' · ')].filter(Boolean).join(' · ')}
        </span>
      </div>
    </button>
  );
};

export default ChronologioPhotoStackCard;
