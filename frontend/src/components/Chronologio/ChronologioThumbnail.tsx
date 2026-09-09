import React from 'react';

type Props = {
  src: string;
  alt?: string;
  className?: string;
  extraCount?: number;
  onClick?: () => void;
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

export default ChronologioThumbnail;
