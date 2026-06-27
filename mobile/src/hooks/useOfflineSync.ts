import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Initializes network listener and offline queue sync.
 * Mount once at app root.
 */
export const useOfflineSync = () => {
  useNetworkStatus();
};
