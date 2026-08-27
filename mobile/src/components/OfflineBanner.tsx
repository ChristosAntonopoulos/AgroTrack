import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AlertBanner from './ui/AlertBanner';
import { useOfflineMode } from '../context/OfflineContext';
import { spacing } from '../theme';

const OfflineBanner: React.FC = () => {
  const { t } = useTranslation('common');
  const {
    isOnline,
    pendingCount,
    isSyncing,
    isShowingCachedData,
    syncNow,
  } = useOfflineMode();

  if (isSyncing && pendingCount > 0) {
    return (
      <View style={styles.wrap}>
        <AlertBanner
          variant="warning"
          icon="cloud-upload-outline"
          message={t('offline.syncing', { count: pendingCount })}
          onPress={() => {
            syncNow().catch(console.error);
          }}
        />
      </View>
    );
  }

  if (!isOnline) {
    const message =
      pendingCount > 0
        ? t('offline.offlineWithPending', { count: pendingCount })
        : isShowingCachedData
          ? t('offline.offlineCached')
          : t('offline.offline');

    return (
      <View style={styles.wrap}>
        <AlertBanner variant="warning" icon="cloud-offline-outline" message={message} />
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={styles.wrap}>
        <AlertBanner
          variant="warning"
          icon="sync-outline"
          message={t('offline.pending', { count: pendingCount })}
          onPress={() => {
            syncNow().catch(console.error);
          }}
        />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
});

export default OfflineBanner;
