import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

type Props = {
  src: string;
  alt?: string;
  className?: string;
  extraCount?: number;
  onClick?: () => void;
};

type MediaProps = {
  src: string;
  alt?: string;
  className?: string;
  retryLabel: string;
  unavailableLabel: string;
};

/** Shared Chronologio media thumbnail — fixed size, cover, lazy. */
const ChronologioThumbnail: React.FC<Props> = ({
  src,
  alt = '',
  className = '',
  extraCount = 0,
  onClick,
}) => {
  const content = (
    <>
      <img src={src} alt={alt} loading="lazy" decoding="async" />
      {extraCount > 0 ? <span className="chrono-thumb-extra">+{extraCount}</span> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={`chrono-thumb ${className}`.trim()} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={`chrono-thumb ${className}`.trim()}>{content}</div>;
};

/** Collapses when the file cannot load — never keeps the original image height. */
export const ChronologioMediaImage: React.FC<MediaProps> = ({
  src,
  alt = '',
  className = '',
  retryLabel,
  unavailableLabel,
}) => {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (failed || !src) {
    return (
      <span className="chronologio-media-missing">
        <ImageOff size={14} aria-hidden />
        <span>{unavailableLabel}</span>
        <span
          role="button"
          tabIndex={0}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        >
          {retryLabel}
        </span>
      </span>
    );
  }

  return (
    <img
      key={attempt}
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};

export default ChronologioThumbnail;
