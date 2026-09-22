import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import EmptyState from '../components/Common/EmptyState';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useOfflineMode } from '../context/OfflineContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useModulePageGuard } from '../hooks/useModulePageGuard';
import { isDeviceOnline } from '../utils/networkStatus';
import {
  getFieldService,
  getFieldWorkService,
  getFinancialSummaryService,
  getFinancialTransactionService,
  getHarvestService,
} from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import type { FinancialTransaction } from '../services/financialTransactionService';
import type { YearFinancialSummary } from '../services/financialSummaryService';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { fieldLabelMap } from '../utils/fieldLabels';
import { readFieldId } from '../navigation/intents';
import { agriculturalYearFor, agriculturalYearRangeLabel } from '../chronologio/agriculturalYear';
import { harvestMonthTitle, harvestYearSpan } from '../finance/harvestYear';
import { UNASSIGNED_FIELD_QUERY, overlayUnassignedSummary } from '../finance/buildYearSummary';
import { formatOfficialAmount, isForbiddenError, perAreaForDisplay } from '../finance/format';
import MoneyPageHeader from '../components/money/MoneyPageHeader';
import MoneyContextBar from '../components/money/MoneyContextBar';
import MoneySummaryGrid from '../components/money/MoneySummaryGrid';
import FinancialDataTrustStrip from '../components/money/FinancialDataTrustStrip';
import OliveOilEconomicsCard from '../components/money/OliveOilEconomicsCard';
import MonthlyFinancialTrend from '../components/money/MonthlyFinancialTrend';
import MoneyFieldRows from '../components/money/MoneyFieldRows';
import MoneyCategoryBreakdown from '../components/money/MoneyCategoryBreakdown';
import MoneyExpandableSection from '../components/money/MoneyExpandableSection';
import TransactionSection from '../components/money/TransactionSection';
import MoneyTransactionDrawer from '../components/money/MoneyTransactionDrawer';
import { formatRelatedHarvestLabel } from '../finance/relatedHarvestLabel';
import { downloadTextFile, moneyLedgerCsv } from '../finance/moneyExport';
import { unassignedFieldLabel } from '../finance/display';
import { useLocaleFormatters } from '../hooks/useLocaleFormatters';
import '../components/money/Money.css';

type KindFilter = 'all' | 'income' | 'expense' | 'draft';

const PAGE_SIZE = 20;

/** Official totals come from GetYearFinancialSummary only. */
const MoneyPage: React.FC = () => {
  const { t, i18n } = useTranslation(['money', 'capture', 'common']);
  const { user } = useAuth();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();
  const capture = useCaptureOptional();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageGuard = useModulePageGuard({ module: 'money' });
  const { dateFormat } = useLocaleFormatters();

  const currentYear = agriculturalYearFor(new Date());
  const year = Number(searchParams.get('year')) || currentYear;
  const fieldId = readFieldId(searchParams);
  const month = Number(searchParams.get('month')) || 0;
  const kindParam = searchParams.get('kind');
  const kind: KindFilter =
    kindParam === 'income' || kindParam === 'expense' || kindParam === 'draft' ? kindParam : 'all';
  const category = searchParams.get('category') || '';
  const taskFilter = searchParams.get('task') || '';
  const harvestFilter = searchParams.get('harvest') || '';
  const txId = searchParams.get('tx') || '';
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [fields, setFields] = useState<Field[]>([]);
  const [summary, setSummary] = useState<YearFinancialSummary | null>(null);
  const [summaryForbidden, setSummaryForbidden] = useState(false);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPage, setNextPage] = useState(2);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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
    if (!searchParams.get('year')) {
      patch({ year: String(currentYear) });
    }
  }, [currentYear, searchParams]);

  useEffect(() => {
    const onSaved = () => setReloadToken((n) => n + 1);
    window.addEventListener(CAPTURE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(CAPTURE_SAVED_EVENT, onSaved);
  }, []);

  const listParams = () => ({
    resultYear: year,
    fieldId: fieldId && fieldId !== UNASSIGNED_FIELD_QUERY ? fieldId : undefined,
    type: kind === 'income' || kind === 'expense' ? kind : undefined,
    status: kind === 'draft' ? ('draft' as const) : undefined,
    category: category || undefined,
    month: month || undefined,
    relatedTaskId: taskFilter || undefined,
    relatedHarvestId: harvestFilter || undefined,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const list = await getFieldService().getFields();
        if (cancelled) return;
        setFields(list.filter((field) => field.status !== 'Draft'));
        setShowingCachedData(!isDeviceOnline());

        const summaryFieldId = fieldId === UNASSIGNED_FIELD_QUERY ? undefined : fieldId || undefined;
        const [yearSummary, ledger] = await Promise.all([
          getFinancialSummaryService()
            .getYear(year, summaryFieldId, i18n.language)
            .then((result) => ({ ok: true as const, result }))
            .catch((error) => {
              if (isForbiddenError(error)) return { ok: false as const, result: null };
              throw error;
            }),
          getFinancialTransactionService().list({
            ...listParams(),
            page: 1,
          }),
        ]);
        if (cancelled) return;
        setSummaryForbidden(!yearSummary.ok);
        setSummary(
          yearSummary.result && fieldId === UNASSIGNED_FIELD_QUERY
            ? overlayUnassignedSummary(yearSummary.result, i18n.language)
            : yearSummary.result
        );
        const items = ledger.items.filter((row) => {
          if (row.status === 'void') return false;
          if (fieldId === UNASSIGNED_FIELD_QUERY) return !row.fieldId;
          return true;
        });
        setTransactions(items);
        setTotalCount(ledger.totalCount);
        setNextPage(2);
      } catch {
        if (!cancelled) {
          setFields([]);
          setSummary(null);
          setTransactions([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    category,
    fieldId,
    harvestFilter,
    i18n.language,
    kind,
    month,
    refreshGeneration,
    reloadToken,
    setShowingCachedData,
    taskFilter,
    year,
  ]);

  const loadOlder = async () => {
    try {
      setLoadingMore(true);
      const ledger = await getFinancialTransactionService().list({
        ...listParams(),
        page: nextPage,
      });
      const items = ledger.items.filter((row) => {
        if (row.status === 'void') return false;
        if (fieldId === UNASSIGNED_FIELD_QUERY) return !row.fieldId;
        return true;
      });
      setTransactions((prev) => [...prev, ...items]);
      setTotalCount(ledger.totalCount);
      setNextPage((current) => current + 1);
    } finally {
      setLoadingMore(false);
    }
  };

  const fieldNames = useMemo(() => fieldLabelMap(fields), [fields]);
  const [deepLinkedTx, setDeepLinkedTx] = useState<FinancialTransaction | null>(null);
  const selected = transactions.find((row) => row.id === txId) || deepLinkedTx;
  const [relatedTitles, setRelatedTitles] = useState<{ task?: string; harvest?: string }>({});

  useEffect(() => {
    if (!txId) {
      setDeepLinkedTx(null);
      return;
    }
    if (transactions.some((row) => row.id === txId)) {
      setDeepLinkedTx(null);
      return;
    }
    let cancelled = false;
    void getFinancialTransactionService()
      .getById(txId)
      .then((tx) => {
        if (!cancelled) setDeepLinkedTx(tx);
      })
      .catch(() => {
        if (!cancelled) setDeepLinkedTx(null);
      });
    return () => {
      cancelled = true;
    };
  }, [txId, transactions]);

  useEffect(() => {
    if (!selected?.relatedTaskId && !selected?.relatedHarvestId) {
      setRelatedTitles({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const taskTitle = selected.relatedTaskId
        ? await getFieldWorkService()
            .getFieldTask(selected.relatedTaskId)
            .then((task) => task.title)
            .catch(() => undefined)
        : undefined;
      let harvestTitle: string | undefined;
      if (selected.relatedHarvestId && selected.fieldId) {
        const harvests = await getHarvestService()
          .listByField(selected.fieldId)
          .catch(() => []);
        const hit = harvests.find((h) => h.id === selected.relatedHarvestId);
        harvestTitle = hit
          ? formatRelatedHarvestLabel(hit, {
              fieldName: fieldNames[selected.fieldId] || undefined,
              locale: i18n.language,
              dateFormat,
              statusLabel: (status) =>
                status === 'voided'
                  ? t('money:harvestStatusVoided')
                  : t('money:harvestStatusPosted'),
            })
          : undefined;
      }
      if (!cancelled) setRelatedTitles({ task: taskTitle, harvest: harvestTitle });
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, fieldNames, dateFormat, i18n.language, t]);

  const visibleFields = fields.filter((field) => field.status !== 'Draft');
  const canManage =
    user?.role === 'FieldOwner' ||
    user?.role === 'Administrator' ||
    Boolean(selected && (selected.createdByUserId === user?.userId || selected.ownerUserId === user?.userId));

  const openCapture = (preferredType: 'money' | 'income' | 'expense' = 'money') => {
    capture?.openCapture({
      preferredType,
      fieldId: fieldId && fieldId !== UNASSIGNED_FIELD_QUERY ? fieldId : visibleFields[0]?.id,
      taskId: taskFilter || undefined,
    });
  };

  const reload = () => setReloadToken((n) => n + 1);

  const exportLedger = async () => {
    try {
      setExporting(true);
      setExportError(null);
      const pageSize = 200;
      const collected: FinancialTransaction[] = [];
      let page = 1;
      let fetched = 0;
      let total = Number.POSITIVE_INFINITY;
      while (fetched < total && page <= 25) {
        const ledger = await getFinancialTransactionService().list({
          ...listParams(),
          page,
          pageSize,
        });
        total = ledger.totalCount;
        fetched += ledger.items.length;
        collected.push(
          ...ledger.items.filter((row) => {
            if (row.status === 'void') return false;
            if (fieldId === UNASSIGNED_FIELD_QUERY) return !row.fieldId;
            return true;
          })
        );
        if (ledger.items.length === 0) break;
        page += 1;
      }
      const csv = moneyLedgerCsv({
        rows: collected,
        fieldNames,
        unassignedLabel: unassignedFieldLabel(i18n.language),
      });
      downloadTextFile(`money-${harvestYearSpan(year)}.csv`, csv);
    } catch {
      setExportError(t('money:exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const emptyYear =
    !summaryForbidden &&
    summary &&
    !summary.dataAvailability.hasPostedRecords &&
    summary.draftCount === 0 &&
    transactions.length === 0;

  const shell = (body: React.ReactNode, captureEnabled = true) => (
    <PageContainer maxWidth="full" padding="none">
      <div className="money-page">
        <Breadcrumbs />
        <MoneyPageHeader
          fields={visibleFields}
          fieldId={fieldId}
          onFieldChange={(next) => patch({ fieldId: next || null })}
          onCapture={captureEnabled ? () => openCapture() : undefined}
        />
        {body}
      </div>
    </PageContainer>
  );

  if (pageGuard.loading) {
    return (
      <PageContainer>
        <LoadingSpinner />
      </PageContainer>
    );
  }
  if (!pageGuard.allowed) {
    return <Navigate to="/access-denied?module=money" replace />;
  }

  if (loading && !summary) {
    return shell(
      <>
        <div className="money-skeleton" aria-busy="true">
          <span />
          <span />
          <span />
        </div>
      </>
    );
  }

  if (visibleFields.length === 0) {
    return shell(
      <EmptyState title={t('money:emptyFieldsTitle')} description={t('money:emptyFieldsHint')} />,
      false
    );
  }

  return (
    <PageContainer maxWidth="full" padding="none">
      <div className="money-page">
        <Breadcrumbs />
        <MoneyPageHeader
          fields={visibleFields}
          fieldId={fieldId}
          onFieldChange={(next) => patch({ fieldId: next || null })}
          onCapture={() => openCapture()}
          onExport={() => void exportLedger()}
          exporting={exporting}
        />
        {exportError ? <p className="money-error">{exportError}</p> : null}
        <MoneyContextBar
          year={year}
          yearRangeLabel={agriculturalYearRangeLabel(year, i18n.language)}
          kind={kind}
          hideIncome={summaryForbidden}
          onYearChange={(next) => patch({ year: String(next), month: null })}
          onKindChange={(value) => patch({ kind: value === 'all' ? null : value })}
        />

        {summaryForbidden ? (
          <EmptyState title={t('money:collaboratorTitle')} description={t('money:collaboratorHint')} />
        ) : emptyYear ? (
          <EmptyState
            title={t('money:emptyTitle', { span: harvestYearSpan(year) })}
            description={t('money:emptyHint')}
            action={
              <Button variant="primary" onClick={() => openCapture()}>
                {t('capture:money.cta')}
              </Button>
            }
          />
        ) : summary ? (
          <>
            <MoneySummaryGrid
              summary={summary}
              locale={i18n.language}
              onAddIncome={() => openCapture('income')}
            />
            <FinancialDataTrustStrip
              summary={summary}
              locale={i18n.language}
              fieldCount={summary.fieldResults.length || (fieldId ? 1 : 0)}
              onOpenDrafts={() => patch({ kind: 'draft' })}
            />
            {summary.dataAvailability.hasPostedRecords ? (
              <MonthlyFinancialTrend
                year={year}
                months={summary.monthlyResults}
                currency={summary.currency}
                locale={i18n.language}
                selectedMonth={month || undefined}
                onSelectMonth={(next) => patch({ month: next ? String(next) : null })}
              />
            ) : null}
            {(summary.costPerHectare != null ||
              summary.incomePerHectare != null ||
              summary.netPerHectare != null ||
              summary.costPerKilogramOfOil != null ||
              summary.costPerKilogramMessage) ? (
              <MoneyExpandableSection title={t('money:unitEconomicsTitle')}>
                {summary.costPerHectare != null ? (
                  <p>
                    {t('money:costPerHectare')}:{' '}
                    {formatOfficialAmount(
                      perAreaForDisplay(summary.costPerHectare, i18n.language),
                      summary.currency,
                      i18n.language,
                      t('money:unknownAmount')
                    )}
                  </p>
                ) : null}
                {summary.incomePerHectare != null ? (
                  <p>
                    {t('money:incomePerHectare')}:{' '}
                    {formatOfficialAmount(
                      perAreaForDisplay(summary.incomePerHectare, i18n.language),
                      summary.currency,
                      i18n.language,
                      t('money:unknownAmount')
                    )}
                  </p>
                ) : null}
                {summary.netPerHectare != null ? (
                  <p>
                    {t('money:netPerHectare')}:{' '}
                    {formatOfficialAmount(
                      perAreaForDisplay(summary.netPerHectare, i18n.language),
                      summary.currency,
                      i18n.language,
                      t('money:unknownAmount')
                    )}
                  </p>
                ) : null}
                {summary.costPerKilogramOfOil != null ? (
                  <p>
                    {t('money:costPerKg')}:{' '}
                    {formatOfficialAmount(
                      summary.costPerKilogramOfOil,
                      summary.currency,
                      i18n.language,
                      t('money:unknownAmount')
                    )}
                  </p>
                ) : summary.costPerKilogramMessage ? (
                  <p className="money-summary-note">{summary.costPerKilogramMessage}</p>
                ) : null}
              </MoneyExpandableSection>
            ) : null}
            {summary.oliveOil?.hasProductionOrSales ? (
              <MoneyExpandableSection title={t('money:oliveOilYear', { span: harvestYearSpan(year) })}>
                <OliveOilEconomicsCard year={year} oil={summary.oliveOil} locale={i18n.language} embedded />
              </MoneyExpandableSection>
            ) : null}
            {summary.dataAvailability.hasPostedRecords &&
            (summary.expenseByCategory.length > 0 || summary.incomeByCategory.length > 0) ? (
              <MoneyExpandableSection title={t('money:categories')}>
                <MoneyCategoryBreakdown
                  expenses={summary.expenseByCategory}
                  income={summary.incomeByCategory}
                  currency={summary.currency}
                  locale={i18n.language}
                  onSelectCategory={(value) => patch({ category: value, kind: 'all' })}
                  embedded
                />
              </MoneyExpandableSection>
            ) : null}
            {!fieldId ? (
              <MoneyFieldRows
                rows={summary.fieldResults}
                currency={summary.currency}
                locale={i18n.language}
                showPerHectare={true}
                fieldNames={fieldNames}
                fields={visibleFields}
                missingAreaFieldIds={summary.dataAvailability.missingAreaFieldIds ?? []}
                onSelectField={(id) => patch({ fieldId: id || null })}
              />
            ) : null}
          </>
        ) : null}

        {!emptyYear || summaryForbidden ? (
          <TransactionSection
            items={transactions}
            totalCount={totalCount}
            loadingMore={loadingMore}
            locale={i18n.language}
            fieldNames={fieldNames}
            category={category}
            month={month}
            monthLabel={month ? harvestMonthTitle(year, month, i18n.language) : undefined}
            onClearFilters={() => patch({ category: null, month: null, task: null, harvest: null })}
            onOpen={(id) => patch({ tx: id })}
            onLoadMore={() => void loadOlder()}
          />
        ) : null}
      </div>

      <MoneyTransactionDrawer
        transaction={selected}
        fieldName={selected?.fieldId ? fieldNames[selected.fieldId] : undefined}
        relatedTaskTitle={relatedTitles.task}
        relatedHarvestTitle={relatedTitles.harvest}
        canManage={canManage}
        onClose={() => patch({ tx: null })}
        onVoid={async (id, reason) => {
          await getFinancialTransactionService().void(id, reason);
          patch({ tx: null });
          reload();
        }}
        onPostDraft={async (id) => {
          await getFinancialTransactionService().post(id);
          patch({ tx: null });
          reload();
        }}
        onDeleteDraft={async (id) => {
          await getFinancialTransactionService().deleteDraft(id);
          patch({ tx: null });
          reload();
        }}
      />
    </PageContainer>
  );
};

export default MoneyPage;
