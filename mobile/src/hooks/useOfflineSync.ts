/**
 * Initializes offline sync via OfflineProvider.
 * Kept for App.tsx compatibility; provider owns NetInfo + flush.
 */
export const useOfflineSync = () => {
  // no-op: OfflineProvider handles network + queue sync
};
