import React from 'react';
import { useTranslation } from 'react-i18next';
import { CloudOff, RefreshCw, UploadCloud } from 'lucide-react';
import { useOfflineMode } from '../../context/OfflineContext';
import './OfflineBanner.css';

const OfflineBanner: React.FC = () => {
  const { t } = useTranslation('common');
  const { isOnline, pendingCount, isSyncing, isShowingCachedData, syncNow } = useOfflineMode();

  if (isSyncing && pendingCount > 0) {
    return (
      <div className="offline-banner offline-banner--syncing" role="status">
        <UploadCloud size={16} aria-hidden />
        <span>{t('offline.syncing', { count: pendingCount })}</span>
        <button type="button" className="offline-banner-action" onClick={() => void syncNow()}>
          {t('retry')}
        </button>
      </div>
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
      <div className="offline-banner offline-banner--offline" role="status">
        <CloudOff size={16} aria-hidden />
        <span>{message}</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="offline-banner offline-banner--pending" role="status">
        <RefreshCw size={16} aria-hidden />
        <span>{t('offline.pending', { count: pendingCount })}</span>
        <button type="button" className="offline-banner-action" onClick={() => void syncNow()}>
          {t('retry')}
        </button>
      </div>
    );
  }

  return null;
};

export default OfflineBanner;
