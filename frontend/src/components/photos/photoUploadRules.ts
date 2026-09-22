export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export const PHOTO_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif';

export type PhotoFileIssue = 'heic' | 'unsupported' | 'oversize' | 'empty';

const EXT_OK = /\.(jpe?g|png|webp|gif)$/i;

export const classifyPhotoFile = (file: Pick<File, 'name' | 'type' | 'size'>): PhotoFileIssue | null => {
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (file.size <= 0) return 'empty';
  if (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  ) {
    return 'heic';
  }
  if (file.size > PHOTO_MAX_BYTES) return 'oversize';
  const typeOk =
    type === 'image/jpeg' ||
    type === 'image/jpg' ||
    type === 'image/png' ||
    type === 'image/webp' ||
    type === 'image/gif';
  if (typeOk || EXT_OK.test(name)) return null;
  return 'unsupported';
};
