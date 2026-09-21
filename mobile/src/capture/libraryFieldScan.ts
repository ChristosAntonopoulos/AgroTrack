import { Alert, NativeModules, Platform } from 'react-native';
import type { Field } from '../services/fieldService';
import { isNearAnyField } from '../utils/geoMatch';

export type LibraryScanRange = '3m' | '12m' | 'all';

export type LibraryFieldMatch = {
  assetId: string;
  uri: string;
  filename: string;
  latitude: number;
  longitude: number;
  creationTime: number;
};

export type LibraryScanResult = {
  matches: LibraryFieldMatch[];
  scanned: number;
  withLocation: number;
  truncated: boolean;
};

export type ScanLibraryOptions = {
  fields: Field[];
  range: LibraryScanRange;
  /** Soft cap on matches returned (default 80). */
  maxMatches?: number;
  /** Soft cap on assets inspected (default 2500). */
  maxAssets?: number;
  onProgress?: (scanned: number, matches: number) => void;
};

/** Minimal shape — avoid importing expo-media-library at module load (crashes without native binary). */
type MediaAsset = {
  id: string;
  uri?: string | null;
  filename?: string | null;
  creationTime: number;
  location?: { latitude?: number; longitude?: number } | null;
};

type MediaLibraryModule = {
  getPermissionsAsync: (
    write?: boolean,
    granularPermissions?: string[]
  ) => Promise<{
    granted: boolean;
    accessPrivileges?: string;
  }>;
  requestPermissionsAsync: (
    write?: boolean,
    granularPermissions?: string[]
  ) => Promise<{
    granted: boolean;
    accessPrivileges?: string;
  }>;
  getAssetInfoAsync: (
    asset: MediaAsset | string,
    options?: { shouldDownloadFromNetwork?: boolean }
  ) => Promise<{ location?: { latitude?: number; longitude?: number } | null }>;
  getAssetsAsync: (options: Record<string, unknown>) => Promise<{
    assets: MediaAsset[];
    endCursor?: string;
    hasNextPage: boolean;
  }>;
  MediaType: { photo: unknown };
  SortBy: { creationTime: unknown };
};

const PAGE_SIZE = 80;
const DEFAULT_MAX_MATCHES = 80;
const DEFAULT_MAX_ASSETS = 2500;

let mediaLibraryCache: MediaLibraryModule | null | undefined;

/**
 * Lazy-load expo-media-library. Returns null when the native module is missing
 * (stale dev client) so Photo Hub can still open.
 *
 * Check NativeModules first — requiring the JS package when ExpoMediaLibrary is
 * absent still throws and can surface as an Uncaught Error redbox.
 */
export function getMediaLibrary(): MediaLibraryModule | null {
  if (mediaLibraryCache !== undefined) return mediaLibraryCache;

  const native =
    NativeModules.ExpoMediaLibrary ??
    (NativeModules as Record<string, unknown>).ExponentMediaLibrary;
  if (!native) {
    mediaLibraryCache = null;
    return null;
  }

  try {
    // Dynamic require only — never static-import this package.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-media-library') as MediaLibraryModule | { default?: MediaLibraryModule };
    mediaLibraryCache = (mod as { default?: MediaLibraryModule }).default ?? (mod as MediaLibraryModule);
    if (!mediaLibraryCache?.MediaType || !mediaLibraryCache?.getAssetsAsync) {
      mediaLibraryCache = null;
    }
  } catch {
    mediaLibraryCache = null;
  }
  return mediaLibraryCache;
}

export function isMediaLibraryAvailable(): boolean {
  return getMediaLibrary() != null;
}

export class MediaLibraryUnavailableError extends Error {
  constructor() {
    super('ExpoMediaLibrary native module is not available');
    this.name = 'MediaLibraryUnavailableError';
  }
}

const monthsAgoMs = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.getTime();
};

export const createdAfterForRange = (range: LibraryScanRange): number | undefined => {
  if (range === '3m') return monthsAgoMs(3);
  if (range === '12m') return monthsAgoMs(12);
  return undefined;
};

/**
 * Request photo-library access for scanning GPS-tagged assets.
 * Returns false when denied or when the native module is unavailable.
 */
export async function requestLibraryScanPermission(options?: {
  rationaleMessage?: string;
  deniedMessage?: string;
}): Promise<boolean> {
  const MediaLibrary = getMediaLibrary();
  if (!MediaLibrary) return false;

  const existing = await MediaLibrary.getPermissionsAsync(false, ['photo']);
  if (
    existing.granted ||
    existing.accessPrivileges === 'all' ||
    existing.accessPrivileges === 'limited'
  ) {
    return true;
  }

  if (options?.rationaleMessage) {
    await new Promise<void>((resolve) => {
      Alert.alert('', options.rationaleMessage, [
        { text: 'OK', onPress: () => resolve() },
      ]);
    });
  }

  const next = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
  if (
    next.granted ||
    next.accessPrivileges === 'all' ||
    next.accessPrivileges === 'limited'
  ) {
    return true;
  }

  if (options?.deniedMessage) {
    Alert.alert('', options.deniedMessage);
  }
  return false;
}

const resolveLocation = async (
  MediaLibrary: MediaLibraryModule,
  asset: MediaAsset
): Promise<{ latitude: number; longitude: number } | null> => {
  const fromAsset = asset.location;
  if (
    fromAsset &&
    typeof fromAsset.latitude === 'number' &&
    typeof fromAsset.longitude === 'number' &&
    Number.isFinite(fromAsset.latitude) &&
    Number.isFinite(fromAsset.longitude)
  ) {
    return { latitude: fromAsset.latitude, longitude: fromAsset.longitude };
  }

  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset, {
      shouldDownloadFromNetwork: false,
    });
    const loc = info.location;
    if (
      loc &&
      typeof loc.latitude === 'number' &&
      typeof loc.longitude === 'number' &&
      Number.isFinite(loc.latitude) &&
      Number.isFinite(loc.longitude)
    ) {
      return { latitude: loc.latitude, longitude: loc.longitude };
    }
  } catch {
    /* asset may be unavailable offline / iCloud */
  }
  return null;
};

/**
 * Scan the device photo library for images whose GPS is on/near accessible fields.
 */
export async function scanLibraryForFieldPhotos(
  options: ScanLibraryOptions
): Promise<LibraryScanResult> {
  const MediaLibrary = getMediaLibrary();
  if (!MediaLibrary) {
    throw new MediaLibraryUnavailableError();
  }

  const {
    fields,
    range,
    maxMatches = DEFAULT_MAX_MATCHES,
    maxAssets = DEFAULT_MAX_ASSETS,
    onProgress,
  } = options;

  if (fields.length === 0) {
    return { matches: [], scanned: 0, withLocation: 0, truncated: false };
  }

  const createdAfter = createdAfterForRange(range);
  const matches: LibraryFieldMatch[] = [];
  let scanned = 0;
  let withLocation = 0;
  let endCursor: string | undefined;
  let hasNextPage = true;
  let truncated = false;

  while (hasNextPage && scanned < maxAssets && matches.length < maxMatches) {
    const page = await MediaLibrary.getAssetsAsync({
      first: Math.min(PAGE_SIZE, maxAssets - scanned),
      after: endCursor,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      createdAfter,
      ...(Platform.OS === 'android' ? { resolveWithFullInfo: true } : {}),
    });

    for (const asset of page.assets) {
      if (scanned >= maxAssets || matches.length >= maxMatches) {
        truncated = true;
        break;
      }
      scanned += 1;

      const location = await resolveLocation(MediaLibrary, asset);
      if (!location) {
        onProgress?.(scanned, matches.length);
        continue;
      }
      withLocation += 1;

      if (!isNearAnyField(location.latitude, location.longitude, fields)) {
        onProgress?.(scanned, matches.length);
        continue;
      }

      const uri = asset.uri;
      if (!uri) {
        onProgress?.(scanned, matches.length);
        continue;
      }

      matches.push({
        assetId: asset.id,
        uri,
        filename: asset.filename || `photo-${asset.id}.jpg`,
        latitude: location.latitude,
        longitude: location.longitude,
        creationTime: asset.creationTime,
      });
      onProgress?.(scanned, matches.length);
    }

    endCursor = page.endCursor;
    hasNextPage = page.hasNextPage;
    if (!hasNextPage) break;
    if (matches.length >= maxMatches || scanned >= maxAssets) {
      truncated = truncated || hasNextPage;
      break;
    }
  }

  return { matches, scanned, withLocation, truncated };
}
