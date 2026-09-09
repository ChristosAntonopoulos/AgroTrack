import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getFileService } from '../services/serviceFactory';

export type PickPhotosOptions = {
  camera: boolean;
  remainingSlots: number;
  isOnline: boolean;
  offlineMessage?: string;
  permissionDeniedMessage?: string;
};

/** Pick local image URIs from camera or library (does not upload). */
export async function pickCapturePhotoUris(options: PickPhotosOptions): Promise<string[]> {
  const {
    camera,
    remainingSlots,
    isOnline,
    offlineMessage = 'Photos need a connection.',
    permissionDeniedMessage = 'Permission required',
  } = options;

  if (!isOnline) {
    Alert.alert('', offlineMessage);
    return [];
  }
  if (remainingSlots <= 0) return [];

  const permission = camera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('', permissionDeniedMessage);
    return [];
  }

  const result = camera
    ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
    : await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
      });

  if (result.canceled) return [];
  return result.assets.map((a) => a.uri).slice(0, remainingSlots);
}

/** Upload local image URIs via file service; returns remote URLs. */
export async function uploadCapturePhotoUris(uris: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const uri of uris) {
    urls.push(await getFileService().uploadImage(uri));
  }
  return urls;
}
