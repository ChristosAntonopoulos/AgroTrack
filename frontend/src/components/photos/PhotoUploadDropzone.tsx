import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
};

const PhotoUploadDropzone: React.FC<Props> = ({ disabled, onFiles }) => {
  const { t } = useTranslation('photos');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const takeFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const images = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (images.length) onFiles(images);
  };

  return (
    <div
      className={`photo-dropzone${dragging ? ' is-dragging' : ''}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) takeFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        disabled={disabled}
        onChange={(e) => {
          takeFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <strong>{disabled ? t('uploading') : t('upload')}</strong>
      <div>{t('dropHint')}</div>
    </div>
  );
};

export default PhotoUploadDropzone;
