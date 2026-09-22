import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react';
import type { ChronologioEntry } from '../../services/chronologioService';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { collectChronologioImages } from '../../utils/chronologioPhotoGroups';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { presentActorName } from '../../chronologio/eventPresentation';
import { ChronologioMediaImage } from './ChronologioThumbnail';
import ChronologioCategoryIcon from './ChronologioCategoryIcon';

type Props = {
  entries: ChronologioEntry[];
  selected?: boolean;
  showField?: boolean;
  onOpen: () => void;
};

/**
 * Same-day Photo Hub collage — shares Chronologio entry card slot anatomy:
 * type → title → field → date/time → owner → (linked/media) → primary action.
 */
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
  const actorName = presentActorName(entries[0]?.actor?.displayName, i18n.language);
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
      className={`chronologio-event-card chronologio-event-card--observation is-featured chrono-cat-photo chrono-photo-stack${selected ? ' is-selected' : ''}`}
      onClick={onOpen}
      aria-label={t('photos:dayStack.openSheet', { defaultValue: 'Open photos' })}
    >
      <div className="chronologio-card-top">
        <div className="chronologio-card-icon is-note">
          <ChronologioCategoryIcon category="photo" />
        </div>
        <div className="chronologio-card-body">
          <div className="chronologio-card-type chronologio-card-meta">
            <span>
              <Camera size={12} aria-hidden /> {t('photos:dayStack.title')}
            </span>
          </div>
          <h3 className="chronologio-card-title">{t('photos:dayStack.count', { count })}</h3>

          <div className={`chrono-photo-stack-collage ${collageClass}`} aria-hidden>
            {thumbs.length ? (
              thumbs.map((src, i) => (
                <ChronologioMediaImage
                  key={`${src}-${i}`}
                  src={src}
                  className="chrono-photo-stack-cell"
                  retryLabel={t('chronologio:drawer.mediaRetry')}
                  unavailableLabel={t('chronologio:drawer.mediaUnavailable', { index: i + 1 })}
                />
              ))
            ) : (
              <span className="chrono-photo-stack-fallback">
                <Camera size={28} />
              </span>
            )}
            {count > 4 ? <span className="chrono-photo-stack-more">+{count - 4}</span> : null}
          </div>

          {(fieldNames.length > 0 || time || actorName) ? (
            <div className="chronologio-card-foot">
              {fieldNames.length > 0 ? (
                <div className="chronologio-card-field">
                  <span>{fieldNames.map((n) => friendlyFieldLabel(String(n))).join(' · ')}</span>
                </div>
              ) : null}
              {time ? (
                <time className="chronologio-card-when" dateTime={entries[0]?.occurredAt}>
                  {time}
                </time>
              ) : null}
              {actorName ? (
                <div className="chronologio-card-owner chronologio-card-actor">
                  {t('chronologio:fromActor', { name: actorName })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
};

export default ChronologioPhotoStackCard;
