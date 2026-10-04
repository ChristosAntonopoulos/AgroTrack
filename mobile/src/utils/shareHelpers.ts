import { Share } from 'react-native';

/** Build a QR image URL for invite sharing (same CDN as web). */
export const qrImageUrl = (data: string, size = 220): string =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

/**
 * Copy/share text without a native clipboard module.
 * Uses the system share sheet (includes Copy on Android/iOS).
 * Avoids expo-clipboard until the native app is rebuilt with it.
 */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    await Share.share({ message: text });
    return true;
  } catch {
    return false;
  }
};

export const canNativeShare = (): boolean => true;

export const nativeShare = async (title: string, text: string, url: string): Promise<boolean> => {
  try {
    const message = url && !text.includes(url) ? `${text}\n${url}` : text || url;
    await Share.share({ title, message, url });
    return true;
  } catch {
    return false;
  }
};
