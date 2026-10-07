import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, MapPin } from 'lucide-react';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import LoadingSpinner from '../Common/LoadingSpinner';
import { useSubscription } from '../../context/SubscriptionContext';
import { subscriptionService } from '../../services/subscriptionService';
import type { OwnedFieldSummary } from '../../billing/subscriptionModel';
import { trackBillingEvent } from '../../billing/billingAnalytics';
import './Subscription.css';

type LoadState = 'loading' | 'ready' | 'error';

const WritableFieldDrawer: React.FC = () => {
  const { t } = useTranslation('subscription');
  const {
    writableSelectionOpen,
    closeWritableSelection,
    applySnapshot,
    snapshot,
    showUpgradePaywall,
  } = useSubscription();
  const [fields, setFields] = useState<OwnedFieldSummary[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [choice, setChoice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    setSaveError(false);
    try {
      const rows = await subscriptionService.getOwnedFields();
      setFields(rows);
      setChoice(rows.find((row) => row.isWritable)?.id ?? rows[0]?.id ?? null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (writableSelectionOpen) {
      void load();
      trackBillingEvent('writable_selection_opened');
    }
  }, [writableSelectionOpen, load]);

  const confirm = async () => {
    if (!choice) return;
    setSaving(true);
    setSaveError(false);
    try {
      const next = await subscriptionService.selectWritableField(choice);
      applySnapshot(next);
      closeWritableSelection();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const limit = snapshot?.limits.ownedFields ?? 1;

  return (
    <RightDrawer
      open={writableSelectionOpen}
      onClose={closeWritableSelection}
      title={t('writable.title')}
      subtitle={t('writable.body', { count: limit })}
      icon={<MapPin size={20} />}
      size="md"
      footer={
        state === 'ready' ? (
          <div className="sub-drawer-footer">
            <Button
              variant="primary"
              fullWidth
              disabled={!choice || saving}
              loading={saving}
              onClick={() => void confirm()}
            >
              {t('writable.confirm')}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                closeWritableSelection();
                showUpgradePaywall({ source: 'settings', intent: 'upgrade' });
              }}
            >
              {t('writable.orUpgrade')}
            </Button>
          </div>
        ) : null
      }
    >
      {state === 'loading' ? <LoadingSpinner className="page-inline-loading" /> : null}
      {state === 'error' ? (
        <div className="sub-calm">
          <p>{t('writable.loadError')}</p>
          <Button variant="outline" onClick={() => void load()}>
            {t('paywall.cta.retry')}
          </Button>
        </div>
      ) : null}
      {state === 'ready' && fields.length === 0 ? <p>{t('writable.empty')}</p> : null}
      {state === 'ready' ? (
        <ul className="writable-list">
          {fields.map((field) => {
            const selected = choice === field.id;
            return (
              <li key={field.id}>
                <button
                  type="button"
                  className={`writable-option ${selected ? 'is-selected' : ''}`}
                  onClick={() => setChoice(field.id)}
                  aria-pressed={selected}
                >
                  <span className="writable-option-check" aria-hidden>
                    {selected ? <Check size={16} /> : null}
                  </span>
                  <span>
                    <strong>{field.name}</strong>
                    {field.isWritable ? (
                      <span className="writable-option-meta">{t('writable.current')}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {saveError ? <p className="sub-calm-body" role="alert">{t('writable.error')}</p> : null}
    </RightDrawer>
  );
};

export default WritableFieldDrawer;
