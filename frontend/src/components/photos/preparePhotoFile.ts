import { sha256Hex } from './photoDuplicates';

export type PhotoMeta = {
  capturedAt: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type PreparedPhoto = PhotoMeta & {
  file: File;
  sourceHash: string | null;
  transcoded: boolean;
};

const HEIC_EXT = /\.(heic|heif)$/i;

export const isHeicFile = (file: Pick<File, 'name' | 'type'>): boolean => {
  const type = (file.type || '').toLowerCase();
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence' ||
    HEIC_EXT.test(file.name)
  );
};

const emptyMeta = (): PhotoMeta => ({ capturedAt: null, latitude: null, longitude: null });

export const readPhotoMeta = async (file: Blob): Promise<PhotoMeta> => {
  try {
    const exifr = await import('exifr');
    const parse = exifr.parse ?? exifr.default?.parse;
    if (!parse) return emptyMeta();
    const data = await parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'],
    });
    const date = data?.DateTimeOriginal || data?.CreateDate;
    const capturedAt =
      date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
    return {
      capturedAt,
      latitude: typeof data?.latitude === 'number' ? data.latitude : null,
      longitude: typeof data?.longitude === 'number' ? data.longitude : null,
    };
  } catch {
    return emptyMeta();
  }
};

const convertWithCanvas = async (file: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas');
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((next) => resolve(next), 'image/jpeg', 0.92)
    );
    if (!blob) throw new Error('jpeg');
    return blob;
  } finally {
    bitmap.close();
  }
};

export const convertHeicToJpeg = async (file: Blob): Promise<Blob> => {
  try {
    return await convertWithCanvas(file);
  } catch {
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    return Array.isArray(result) ? result[0] : result;
  }
};

const jpegName = (name: string) => name.replace(/\.(heic|heif)$/i, '') + '.jpg';

export const preparePhotoFile = async (
  file: File,
  deps?: {
    convertHeic?: (file: File) => Promise<Blob>;
    readMeta?: (file: File) => Promise<PhotoMeta>;
    hash?: (blob: Blob) => Promise<string | null>;
  }
): Promise<PreparedPhoto> => {
  const meta = await (deps?.readMeta ?? readPhotoMeta)(file);
  const sourceHash = await (deps?.hash ?? sha256Hex)(file);
  if (!isHeicFile(file)) {
    return { file, ...meta, sourceHash, transcoded: false };
  }

  const blob = await (deps?.convertHeic ?? convertHeicToJpeg)(file);
  const jpeg = new File([blob], jpegName(file.name || 'photo.heic'), {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
  return { file: jpeg, ...meta, sourceHash, transcoded: true };
};
