import {
  chronologioPath,
  harvestPath,
  taskPeekPath,
} from '../../navigation/intents';
import type { Photo } from '../../services/photoService';

/** Route for the photo's primary linked record, when the owner type is known. */
export const linkedRecordPath = (photo: Photo): string | null => {
  if (!photo.isLinked || !photo.ownerId) return null;
  switch (photo.ownerType) {
    case 'task':
      return taskPeekPath(photo.ownerId);
    case 'harvest':
      return harvestPath({ fieldId: photo.fieldId || undefined, harvestId: photo.ownerId });
    case 'note':
      return chronologioPath({
        fieldId: photo.fieldId || undefined,
        entry: `Note:${photo.ownerId}`,
      });
    case 'phenology':
      return chronologioPath({
        fieldId: photo.fieldId || undefined,
        entry: `Phenology:${photo.ownerId}`,
      });
    default:
      return null;
  }
};

export const linkedRecordLabel = (
  photo: Photo,
  typeLabel: (ownerType: string) => string
): string => {
  const type = typeLabel(photo.ownerType);
  if (photo.linkedTitle?.trim()) {
    return `${type}: ${photo.linkedTitle.trim()}`;
  }
  return type;
};
