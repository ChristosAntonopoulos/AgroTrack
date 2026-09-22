import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type LoadState = 'loading' | 'loaded' | 'error' | 'missing' | 'denied';

type Props = {
  src: string;
  alt: string;
  fit?: 'cover' | 'contain';
  className?: string;
  /** When set, a successful image is a button that opens the photo. */
  onActivate?: () => void;
  activateLabel?: string;
};

const classifyFailure = async (src: string): Promise<LoadState> => {
  try {
    const response = await fetch(src, { method: 'GET', cache: 'no-store' });
    if (response.status === 401 || response.status === 403) return 'denied';
    if (response.status === 404 || response.status === 410) return 'missing';
    return 'error';
  } catch {
    return 'error';
  }
};

const PhotoFrame: React.FC<Props> = ({
  src,
  alt,
  fit = 'cover',
  className = '',
  onActivate,
  activateLabel,
}) => {
  const { t } = useTranslation('photos');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>(src ? 'loading' : 'missing');

  useEffect(() => {
    setState(src ? 'loading' : 'missing');
  }, [src, attempt]);

  const message =
    state === 'denied'
      ? t('errors.imageDenied')
      : state === 'missing'
        ? t('errors.imageMissing')
        : t('errors.image');

  const image = src ? (
    <img
      key={`${src}-${attempt}`}
      src={src}
      alt={state === 'loaded' ? alt : ''}
      className={`photo-frame-img is-${fit}`}
      draggable={false}
      onLoad={() => setState('loaded')}
      onError={() => {
        setState('error');
        void classifyFailure(src).then((next) => {
          if (next === 'missing' || next === 'denied') setState(next);
        });
      }}
    />
  ) : null;

  return (
    <div className={`photo-frame is-${state} ${className}`.trim()} data-state={state}>
      {state === 'loading' ? (
        <span className="photo-frame-loading" role="status" aria-label={t('loading')} />
      ) : null}
      {state === 'loaded' && onActivate ? (
        <button type="button" className="photo-frame-hit" onClick={onActivate} aria-label={activateLabel || alt}>
          {image}
        </button>
      ) : (
        image
      )}
      {state === 'error' || state === 'missing' || state === 'denied' ? (
        <div className="photo-frame-fallback" role="alert">
          <p>{message}</p>
          {state === 'error' ? (
            <button type="button" className="photo-frame-retry" onClick={() => setAttempt((n) => n + 1)}>
              {t('errors.imageRetry')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default PhotoFrame;
