import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOfflineMode } from '../context/OfflineContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useFieldCapacity } from '../hooks/useFieldCapacity';
import { useLocale } from '../context/LocaleProvider';
import {
  getFieldService,
  getTaskService,
  getFinancialEntryService,
  getChronologioService,
} from '../services/serviceFactory';
import { isDeviceOnline } from '../utils/networkStatus';
import { getApiErrorMessage } from '../utils/translateApiError';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { FieldFinancialSummary } from '../services/financialEntryService';
import type { ChronologioEntry } from '../services/chronologioService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import FieldDetailMap from '../components/fields/FieldDetailMap';
import FieldIdentity from '../components/fields/FieldIdentity';
import FieldMoreMenu from '../components/fields/FieldMoreMenu';
import FieldTodaySummary from '../components/fields/FieldTodaySummary';
import FieldFinanceSummary from '../components/fields/FieldFinanceSummary';
import FieldRecentChronologio from '../components/fields/FieldRecentChronologio';
import FieldAttentionCard from '../components/fields/FieldAttentionCard';
import FieldFacts from '../components/fields/FieldFacts';
import ChronologioLiving from '../components/Chronologio/ChronologioLiving';
import './FieldDetailPage.css';
import '../components/fields/FieldOverviewBlocks.css';

type FieldMode = 'overview' | 'chronologio';

const FieldDetailPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common', 'capture', 'chronologio']);
  const { locale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();
  const capture = useCaptureOptional();

  const [field, setField] = useState<Field | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [costSummary, setCostSummary] = useState<FieldFinancialSummary | null>(null);
  const [recentEntries, setRecentEntries] = useState<ChronologioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mode: FieldMode = searchParams.get('mode') === 'chronologio' ? 'chronologio' : 'overview';

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      try {
        if (!field) setLoading(true);
        const [fieldData, taskData, summary, chrono] = await Promise.all([
          getFieldService().getField(id),
          getTaskService().getTasks(id),
          getFinancialEntryService().getSummary(id).catch(() => null),
          getChronologioService().getFieldChronologio(id, { limit: 8 }).catch(() => [] as ChronologioEntry[]),
        ]);
        if (cancelled) return;
        setField(fieldData);
        setTasks(taskData);
        setCostSummary(summary);
        setRecentEntries(chrono);
        setShowingCachedData(!isDeviceOnline());
      } catch (err: unknown) {
        if (!cancelled) setError(getApiErrorMessage(err, t) || t('fields:controlRoom.failedLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshGeneration]);

  const capacity = useFieldCapacity(field);
  const canOwn = capacity.canOwn || field?.ownerId === user?.userId;

  const setMode = (next: FieldMode) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === 'overview') p.delete('mode');
        else p.set('mode', next);
        return p;
      },
      { replace: true }
    );
  };

  const handleDelete = async () => {
    if (!id || !window.confirm(t('fields:deleteConfirm'))) return;
    try {
      await getFieldService().deleteField(id);
      navigate('/fields');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:failedDelete'));
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="field-detail-page">
          <Breadcrumbs />
          <LoadingSpinner className="page-inline-loading" />
        </div>
      </PageContainer>
    );
  }

  if (error || !field || !id) {
    return (
      <PageContainer>
        <div className="error-container">
          <div className="error-message">{error || t('fields:controlRoom.failedLoad')}</div>
          <Button to="/fields" icon={<ArrowLeft />} variant="outline">
            {t('fields:controlRoom.backToFields')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="field-detail-page">
        <Breadcrumbs />

        <header className="fd-header">
          <FieldIdentity field={field} size="page" />
          <div className="fd-header-actions">
            <Button
              icon={<Plus />}
              variant="primary"
              size="sm"
              onClick={() => capture?.openCapture({ fieldId: field.id })}
            >
              {t('capture:cta')}
            </Button>
            <FieldMoreMenu field={field} canOwn={Boolean(canOwn)} onDelete={canOwn ? handleDelete : undefined} />
          </div>
        </header>

        <div className="fd-mode-switch" role="tablist" aria-label={t('fields:overview.modesAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'overview'}
            className={mode === 'overview' ? 'is-active' : ''}
            onClick={() => setMode('overview')}
          >
            {t('fields:detail.overview')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'chronologio'}
            className={mode === 'chronologio' ? 'is-active' : ''}
            onClick={() => setMode('chronologio')}
          >
            {t('fields:detail.timeline')}
          </button>
        </div>

        {mode === 'chronologio' ? (
          <div className="fd-mode-panel fd-mode-panel--chronologio">
            <ChronologioLiving fieldId={field.id} embedded />
          </div>
        ) : (
          <div className="fd-overview fd-mode-panel">
            <div className="fd-overview-main">
              <FieldTodaySummary fieldId={field.id} tasks={tasks} locale={locale} />
              <FieldAttentionCard fieldId={field.id} entries={recentEntries} />
              <FieldFinanceSummary fieldId={field.id} summary={costSummary} />
              <FieldRecentChronologio fieldId={field.id} entries={recentEntries} />
            </div>
            <div className="fd-overview-map">
              <FieldDetailMap field={field} heightPx={280} showDataLayers={false} compact />
              <FieldFacts field={field} />
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default FieldDetailPage;
