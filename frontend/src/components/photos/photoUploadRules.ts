export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export const PHOTO_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif';

export type PhotoFileIssue = 'unsupported' | 'oversize' | 'empty';

const EXT_OK = /\.(jpe?g|png|webp|gif|hei[cf])$/i;

export const classifyPhotoFile = (file: Pick<File, 'name' | 'type' | 'size'>): PhotoFileIssue | null => {
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (file.size <= 0) return 'empty';
  if (file.size > PHOTO_MAX_BYTES) return 'oversize';
  const typeOk =
    type === 'image/jpeg' ||
    type === 'image/jpg' ||
    type === 'image/png' ||
    type === 'image/webp' ||
    type === 'image/gif' ||
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence';
  if (typeOk || EXT_OK.test(name)) return null;
  return 'unsupported';
};
