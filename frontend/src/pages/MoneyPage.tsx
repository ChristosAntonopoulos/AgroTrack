import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import Button from '../components/Common/Button';
import { useAuth } from '../context/AuthContext';
import { useExperienceMode } from '../context/ExperienceModeContext';
import { useOfflineMode } from '../context/OfflineContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { isDeviceOnline } from '../utils/networkStatus';
import {
  getFieldService,
  getFinancialEntryService,
  getHarvestService,
  getTaskService,
} from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import {
  FinancialEntry,
  UpdateFinancialEntryInput,
} from '../services/financialEntryService';
import type { HarvestRecord } from '../services/harvestService';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { fieldLabelMap, friendlyFieldLabel } from '../utils/fieldLabels';
import {
  economicsGroupFor,
  expenseBreakdown,
  filterByField,
  filterByYear,
  groupMovements,
  harvestKgInYear,
  matchesSearch,
  monthlySeries,
  perFieldRows,
  summarizeEntries,
  yearsFromEntries,
  type EconomicsGroupId,
} from '../utils/economics';
import EconomicsSummary from '../components/economics/EconomicsSummary';
import EconomicsMovements from '../components/economics/EconomicsMovements';
import EconomicsEntryDrawer from '../components/economics/EconomicsEntryDrawer';
import '../components/economics/Economics.css';

type ViewMode = 'summary' | 'movements';
type KindFilter = 'all' | 'income' | 'expense';

const MoneyPage: React.FC = () => {
  const { t, i18n } = useTranslation(['economics', 'capture', 'common']);
  const { user } = useAuth();
  const { isFullPicture } = useExperienceMode();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();
  const capture = useCaptureOptional();
  const [searchParams, setSearchParams] = useSearchParams();

  const view: ViewMode = searchParams.get('view') === 'movements' ? 'movements' : 'summary';
  const fieldId = searchParams.get('fieldId') || '';
  const currentYear = new Date().getFullYear();
  const year = Number(searchParams.get('year')) || currentYear;
  const kindParam = searchParams.get('kind');
  const kind: KindFilter =
    kindParam === 'income' || kindParam === 'expense' ? kindParam : 'all';
  const query = searchParams.get('q') || '';
  const category = (searchParams.get('category') || '') as EconomicsGroupId | '';
  const taskFilter = searchParams.get('task') || '';
  const entryId = searchParams.get('entry') || '';
  const startEditing = searchParams.get('edit') === '1';

  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [fields, setFields] = useState<Field[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const patch = (next: Record<string, string | null | undefined>) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        Object.entries(next).forEach(([key, value]) => {
          if (value == null || value === '') p.delete(key);
          else p.set(key, value);
        });
        return p;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    const onSaved = () => setReloadToken((n) => n + 1);
    window.addEventListener(CAPTURE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(CAPTURE_SAVED_EVENT, onSaved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const list = await getFieldService().getFields();
        if (cancelled) return;
        setFields(list);
        setShowingCachedData(!isDeviceOnline());
        const money = getFinancialEntryService();
        const harvestSvc = getHarvestService();
        const [ledger, harvestRows, taskRows] = await Promise.all([
          Promise.all(list.map((field) => money.listByField(field.id).catch(() => [] as FinancialEntry[]))),
          Promise.all(
            list.map((field) => harvestSvc.listByField(field.id).catch(() => [] as HarvestRecord[]))
          ),
          Promise.all(list.map((field) => getTaskService().getTasks(field.id).catch(() => [] as Task[]))),
        ]);
        if (cancelled) return;
        setEntries(ledger.flat());
        setHarvests(harvestRows.flat());
        setTasks(taskRows.flat());
      } catch {
        if (!cancelled) {
          setFields([]);
          setEntries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshGeneration, reloadToken, setShowingCachedData]);

  const fieldNames = useMemo(() => fieldLabelMap(fields), [fields]);
  const years = useMemo(() => yearsFromEntries(entries), [entries]);
  const scoped = useMemo(
    () => filterByField(filterByYear(entries, year), fieldId || undefined),
    [entries, fieldId, year]
  );
  const totals = useMemo(() => summarizeEntries(scoped), [scoped]);
  const breakdown = useMemo(() => expenseBreakdown(scoped), [scoped]);
  const fieldRows = useMemo(
    () => (fieldId ? null : perFieldRows(filterByYear(entries, year), fields)),
    [entries, fieldId, fields, year]
  );
  const previous = useMemo(
    () => summarizeEntries(filterByField(filterByYear(entries, year - 1), fieldId || undefined)),
    [entries, fieldId, year]
  );
  const monthly = useMemo(
    () => monthlySeries(fieldId ? scoped : filterByYear(entries, year), year),
    [entries, fieldId, scoped, year]
  );

  const unit = useMemo(() => {
    if (!isFullPicture) return { costPerKg: null as number | null, harvestCostPerKg: null as number | null };
    const ids = fieldId ? [fieldId] : fields.map((f) => f.id);
    const kg = harvestKgInYear(harvests, ids, year);
    if (!(kg > 0) || !totals.hasExpenses) return { costPerKg: null, harvestCostPerKg: null };
    const harvestLinked = scoped.filter((e) => e.kind === 'expense' && e.harvestId);
    const harvestSpend = harvestLinked.reduce((sum, e) => sum + e.amount, 0);
    return {
      costPerKg: totals.expenses / kg,
      harvestCostPerKg: harvestLinked.length > 0 ? harvestSpend / kg : null,
    };
  }, [fieldId, fields, harvests, isFullPicture, scoped, totals, year]);

  const filteredMovements = useMemo(() => {
    return scoped.filter((entry) => {
      if (kind !== 'all' && entry.kind !== kind) return false;
      if (category && economicsGroupFor(entry) !== category) return false;
      if (taskFilter && entry.taskId !== taskFilter) return false;
      const label = t(`economics:groups.${economicsGroupFor(entry)}`);
      return matchesSearch(entry, query, fieldNames[entry.fieldId] || '', label);
    });
  }, [category, fieldNames, kind, query, scoped, t, taskFilter]);

  const months = useMemo(() => groupMovements(filteredMovements), [filteredMovements]);
  const recent = useMemo(
    () =>
      [...scoped]
        .sort((a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime())
        .slice(0, 5),
    [scoped]
  );
  const selected = scoped.find((e) => e.id === entryId) || entries.find((e) => e.id === entryId) || null;
  const selectedHarvest = selected?.harvestId
    ? harvests.find((h) => h.id === selected.harvestId) || null
    : null;
  const linkedTasks = useMemo(
    () => tasks.filter((task) => scoped.some((entry) => entry.taskId === task.id)),
    [scoped, tasks]
  );

  const canManage = (id: string) => {
    const field = fields.find((f) => f.id === id);
    return (
      user?.role === 'FieldOwner' ||
      user?.role === 'Administrator' ||
      field?.ownerId === user?.userId
    );
  };

  const reloadLedger = async () => {
    const money = getFinancialEntryService();
    const ledger = await Promise.all(
      fields.map((field) => money.listByField(field.id).catch(() => [] as FinancialEntry[]))
    );
    setEntries(ledger.flat());
  };

  const handleVoid = async (id: string) => {
    await getFinancialEntryService().void(id);
    await reloadLedger();
    patch({ entry: null, edit: null });
  };

  const handleUpdate = async (id: string, input: UpdateFinancialEntryInput) => {
    await getFinancialEntryService().update(id, input);
    await reloadLedger();
    patch({ edit: null });
  };

  const openCapture = (kind: 'expense' | 'income' = 'expense') => {
    capture?.openCapture({
      fieldId: fieldId || fields[0]?.id,
      preferredType: kind,
    });
  };

  if (loading) {
    return (
      <PageContainer>
        <Breadcrumbs />
        <PageHeader title={t('economics:title')} subtitle={t('economics:subtitle')} />
        <LoadingSpinner className="page-inline-loading" />
      </PageContainer>
    );
  }

  if (fields.length === 0) {
    return (
      <PageContainer>
        <Breadcrumbs />
        <PageHeader title={t('economics:title')} subtitle={t('economics:subtitle')} />
        <EmptyState title={t('economics:emptyFieldsTitle')} description={t('economics:emptyFieldsHint')} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="eco-page">
        <Breadcrumbs />
        <PageHeader title={t('economics:title')} subtitle={t('economics:subtitle')} />

        <div className="eco-toolbar">
          <Button variant="primary" onClick={() => openCapture('expense')}>
            {t('economics:captureExpense')}
          </Button>
          <Button variant="primary" onClick={() => openCapture('income')}>
            {t('economics:captureIncome')}
          </Button>
          <label className="sr-only" htmlFor="eco-field">
            {t('economics:fieldAria')}
          </label>
          <select
            id="eco-field"
            className="eco-select"
            value={fieldId}
            onChange={(e) => patch({ fieldId: e.target.value || null })}
          >
            <option value="">{t('economics:allFields')}</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {friendlyFieldLabel(field.name)}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="eco-year">
            {t('economics:yearAria')}
          </label>
          <select
            id="eco-year"
            className="eco-select"
            value={String(year)}
            onChange={(e) => patch({ year: e.target.value })}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="eco-views" role="tablist" aria-label={t('economics:viewsAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'summary'}
            className={view === 'summary' ? 'is-active' : ''}
            onClick={() => patch({ view: null })}
          >
            {t('economics:summary')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'movements'}
            className={view === 'movements' ? 'is-active' : ''}
            onClick={() => patch({ view: 'movements' })}
          >
            {t('economics:movements')}
          </button>
        </div>

        {totals.count === 0 ? (
          <EmptyState
            title={t('economics:emptyTitle')}
            description={t('economics:emptyHint')}
            action={
              <div className="eco-empty-actions">
                <Button variant="primary" onClick={() => openCapture('expense')}>
                  {t('economics:captureExpense')}
                </Button>
                <Button variant="outline" onClick={() => openCapture('income')}>
                  {t('economics:captureIncome')}
                </Button>
              </div>
            }
          />
        ) : view === 'summary' ? (
          <EconomicsSummary
            year={year}
            totals={totals}
            breakdown={breakdown}
            showAllCategories={showAllCategories}
            onToggleCategories={() => setShowAllCategories((v) => !v)}
            fieldRows={fieldRows}
            recent={recent}
            fieldNames={fieldNames}
            locale={i18n.language}
            fullMode={isFullPicture}
            monthly={monthly}
            previous={previous}
            costPerKg={unit.costPerKg}
            harvestCostPerKg={unit.harvestCostPerKg}
            onSelectField={(id) => patch({ fieldId: id, view: 'movements' })}
            onOpenMovements={() => patch({ view: 'movements' })}
            onOpenEntry={(id) => patch({ entry: id })}
            onOpenKind={(next) => patch({ view: 'movements', kind: next })}
            onOpenCategory={(group) => patch({ view: 'movements', category: group, kind: 'expense' })}
          />
        ) : (
          <EconomicsMovements
            months={months}
            fieldNames={fieldNames}
            locale={i18n.language}
            query={query}
            kind={kind}
            category={category}
            taskId={taskFilter}
            tasks={linkedTasks}
            hideFieldMeta={Boolean(fieldId)}
            canManage={canManage}
            onQuery={(value) => patch({ q: value || null })}
            onKind={(next) => patch({ kind: next === 'all' ? null : next })}
            onCategory={(group) => patch({ category: group || null })}
            onTask={(id) => patch({ task: id || null })}
            onOpenEntry={(id) => patch({ entry: id, edit: null })}
            onCorrect={(id) => patch({ entry: id, edit: '1' })}
            onDelete={(id) => {
              if (window.confirm(t('economics:deleteConfirm'))) void handleVoid(id);
            }}
          />
        )}
      </div>

      <EconomicsEntryDrawer
        entry={selected}
        fieldName={selected ? fieldNames[selected.fieldId] : undefined}
        harvest={selectedHarvest}
        canManage={selected ? canManage(selected.fieldId) : false}
        startEditing={startEditing}
        onClose={() => patch({ entry: null, edit: null })}
        onVoid={handleVoid}
        onUpdate={handleUpdate}
      />
    </PageContainer>
  );
};

export default MoneyPage;
