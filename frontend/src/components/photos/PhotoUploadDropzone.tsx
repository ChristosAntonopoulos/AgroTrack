import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus } from 'lucide-react';

type Props = {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  /** Optional determinate progress (e.g. batch uploads). */
  progress?: { done: number; total: number } | null;
  className?: string;
  id?: string;
};

const takeFiles = (list: FileList | null, onFiles: (files: File[]) => void) => {
  if (!list || list.length === 0) return;
  const images = Array.from(list).filter((f) => f.type.startsWith('image/'));
  if (images.length) onFiles(images);
};

/**
 * Compact gallery picker used outside the Photos hub (e.g. field strips).
 * The hub itself uses a single header CTA + page-level drop target.
 */
const PhotoUploadDropzone: React.FC<Props> = ({
  disabled,
  onFiles,
  progress,
  className = '',
  id,
}) => {
  const { t } = useTranslation('photos');
  const galleryRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const openPicker = () => {
    if (!disabled) galleryRef.current?.click();
  };

  const determinate =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : null;

  return (
    <div
      id={id}
      className={`photo-dropzone${dragging ? ' is-dragging' : ''}${disabled ? ' is-uploading' : ''} ${className}`.trim()}
      onClick={openPicker}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) takeFiles(e.dataTransfer.files, onFiles);
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
    >
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        disabled={disabled}
        className="photo-hidden-input"
        onChange={(e) => {
          takeFiles(e.target.files, onFiles);
          e.target.value = '';
        }}
      />
      <span className="photo-dropzone-icon" aria-hidden>
        <ImagePlus size={22} strokeWidth={1.75} />
      </span>
      <strong className="photo-dropzone-title">
        {disabled ? t('uploading') : dragging ? t('dropActive') : t('upload')}
      </strong>
      <div className="photo-dropzone-body">{t('dropHint')}</div>
      {disabled ? (
        <div
          className={`photo-dropzone-progress${determinate != null ? ' is-determinate' : ''}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={determinate ?? undefined}
          aria-label={t('uploading')}
        >
          <div className="photo-dropzone-progress-track">
            <div
              className="photo-dropzone-progress-bar"
              style={determinate != null ? { width: `${determinate}%` } : undefined}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PhotoUploadDropzone;
