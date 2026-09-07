import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Card from '../components/Common/Card';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import FieldCostsPanel from '../components/Field/FieldCostsPanel';
import { useAuth } from '../context/AuthContext';
import { useExperienceMode } from '../context/ExperienceModeContext';
import { useOfflineMode } from '../context/OfflineContext';
import { useFieldCapacity } from '../hooks/useFieldCapacity';
import { isDeviceOnline } from '../utils/networkStatus';
import { getFieldService, getFinancialEntryService, getTaskService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import {
  CreateFinancialEntryInput,
  FieldFinancialSummary,
  FinancialEntry,
} from '../services/financialEntryService';
import './MoneyPage.css';

const MoneyPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common']);
  const { user } = useAuth();
  const { isEveryday, isFullPicture } = useExperienceMode();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedFieldId = searchParams.get('fieldId') || '';

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FieldFinancialSummary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedId) || null,
    [fields, selectedId]
  );
  const capacity = useFieldCapacity(selectedField);
  const canOwn =
    capacity.canOwn || user?.role === 'FieldOwner' || selectedField?.ownerId === user?.userId;
  const canWork = capacity.canWork || user?.role === 'Producer' || canOwn;
  const lifecycleYear = selectedField?.currentLifecycleYear;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const list = await getFieldService().getFields();
        if (cancelled) return;
        setFields(list);
        setShowingCachedData(!isDeviceOnline());
        const nextId =
          (requestedFieldId && list.some((field) => field.id === requestedFieldId)
            ? requestedFieldId
            : '') ||
          (list.length === 1 ? list[0].id : '');
        setSelectedId(nextId);
      } catch {
        if (!cancelled) setFields([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshGeneration, requestedFieldId, setShowingCachedData]);

  useEffect(() => {
    if (!selectedId) {
      setEntries([]);
      setSummary(null);
      setTasks([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const service = getFinancialEntryService();
        const [nextEntries, nextSummary, nextTasks] = await Promise.all([
          service.listByField(selectedId),
          service.getSummary(selectedId, lifecycleYear),
          getTaskService().getTasks(selectedId).catch(() => []),
        ]);
        if (cancelled) return;
        setEntries(nextEntries);
        setSummary(nextSummary);
        setTasks(nextTasks);
      } catch {
        if (!cancelled) {
          setEntries([]);
          setSummary(null);
          setTasks([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, lifecycleYear, refreshGeneration]);

  const chooseField = (fieldId: string) => {
    setSelectedId(fieldId);
    setSearchParams(fieldId ? { fieldId } : {}, { replace: true });
  };

  const handleCreate = async (input: CreateFinancialEntryInput) => {
    const created = await getFinancialEntryService().create(input);
    const service = getFinancialEntryService();
    const [nextEntries, nextSummary] = await Promise.all([
      service.listByField(selectedId),
      service.getSummary(selectedId, lifecycleYear),
    ]);
    setEntries(nextEntries);
    setSummary(nextSummary);
    return created;
  };

  const handleVoid = async (entryId: string) => {
    await getFinancialEntryService().void(entryId);
    const service = getFinancialEntryService();
    const [nextEntries, nextSummary] = await Promise.all([
      service.listByField(selectedId),
      service.getSummary(selectedId, lifecycleYear),
    ]);
    setEntries(nextEntries);
    setSummary(nextSummary);
  };

  const showPicker = fields.length > 1;

  return (
    <PageContainer>
      <Breadcrumbs />
      <h1>{t('fields:costs.pageTitle')}</h1>
      <p>{isEveryday ? t('fields:costs.pageEverydayHint') : t('fields:costs.pageFullHint')}</p>

      {loading ? (
        <LoadingSpinner className="page-inline-loading" />
      ) : fields.length === 0 ? (
        <EmptyState title={t('fields:costs.emptyFieldsTitle')} description={t('fields:costs.emptyFieldsHint')} />
      ) : (
        <div className={`money-page${isEveryday ? ' money-page--everyday' : ''}`}>
          {showPicker ? (
            <section className="money-page-picker" aria-label={t('fields:costs.pickField')}>
              <h2>{t('fields:costs.pickField')}</h2>
              <div className="money-page-fields">
                {fields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    className={`money-page-field${selectedId === field.id ? ' is-active' : ''}`}
                    onClick={() => chooseField(field.id)}
                  >
                    {field.name}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {selectedField ? (
            <Card>
              <FieldCostsPanel
                fieldId={selectedField.id}
                lifecycleYear={lifecycleYear}
                entries={entries}
                summary={summary}
                tasks={tasks.map((task) => ({ id: task.id, title: task.title }))}
                canAdd={canWork}
                canVoid={canOwn}
                compact={isEveryday}
                detailed={isFullPicture}
                onCreate={handleCreate}
                onVoid={canOwn ? handleVoid : undefined}
              />
            </Card>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
};

export default MoneyPage;
