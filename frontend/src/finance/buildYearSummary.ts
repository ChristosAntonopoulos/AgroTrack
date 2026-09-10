import type { FinancialTransaction } from '../services/financialTransactionService';
import type { YearFinancialSummary } from '../services/financialSummaryService';
import {
  financialCategoryLabel,
  noMonthEntriesLabel,
  resultLabel,
  unassignedFieldLabel,
} from './display';

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const postedOf = (rows: FinancialTransaction[]) => rows.filter((row) => row.status === 'posted');

const sumType = (rows: FinancialTransaction[], type: 'income' | 'expense') =>
  roundMoney(rows.filter((row) => row.type === type).reduce((sum, row) => sum + row.amount, 0));

const monthOf = (iso: string) => {
  const match = /^(\d{4})-(\d{2})/.exec(iso);
  if (match) return Number(match[2]);
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 1 : d.getMonth() + 1;
};

export const UNASSIGNED_FIELD_QUERY = '__unassigned__';

export function buildYearSummaryFromTransactions(
  year: number,
  transactions: FinancialTransaction[],
  options?: {
    fieldId?: string;
    language?: string;
    fieldNames?: Record<string, string>;
    unassignedOnly?: boolean;
  }
): YearFinancialSummary {
  const language = options?.language || 'el';
  const unassignedOnly = options?.unassignedOnly || options?.fieldId === UNASSIGNED_FIELD_QUERY;
  const fieldId = unassignedOnly ? undefined : options?.fieldId;
  const scoped = transactions.filter((row) => {
    if (row.resultYear !== year) return false;
    if (unassignedOnly) return !row.fieldId;
    if (fieldId) return row.fieldId === fieldId;
    return true;
  });
  const posted = postedOf(scoped);
  const drafts = scoped.filter((row) => row.status === 'draft');
  const hasPosted = posted.length > 0;
  const income = hasPosted ? sumType(posted, 'income') : null;
  const expenses = hasPosted ? sumType(posted, 'expense') : null;
  const net = hasPosted && income != null && expenses != null ? roundMoney(income - expenses) : null;

  const monthlyResults = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthPosted = posted.filter((row) => monthOf(row.occurredOn) === month);
    const hasRecords = monthPosted.length > 0;
    const monthIncome = hasRecords ? sumType(monthPosted, 'income') : null;
    const monthExpenses = hasRecords ? sumType(monthPosted, 'expense') : null;
    return {
      month,
      income: monthIncome,
      expenses: monthExpenses,
      netResult: hasRecords ? roundMoney((monthIncome || 0) - (monthExpenses || 0)) : null,
      hasRecords,
      emptyLabel: noMonthEntriesLabel(language),
    };
  });

  const fieldIds = [...new Set(posted.map((row) => row.fieldId || '').filter(Boolean))];
  const fieldResults = fieldId
    ? []
    : [
        ...fieldIds.map((id) => {
          const fieldPosted = posted.filter((row) => row.fieldId === id);
          const fieldIncome = fieldPosted.length ? sumType(fieldPosted, 'income') : null;
          const fieldExpenses = fieldPosted.length ? sumType(fieldPosted, 'expense') : null;
          return {
            fieldId: id,
            fieldName: options?.fieldNames?.[id] || id,
            isUnassigned: false,
            income: fieldIncome,
            expenses: fieldExpenses,
            netResult:
              fieldPosted.length && fieldIncome != null && fieldExpenses != null
                ? roundMoney(fieldIncome - fieldExpenses)
                : null,
            costPerHectare: null,
            incomePerHectare: null,
            netPerHectare: null,
            transactionCount: fieldPosted.length,
          };
        }),
        ...(() => {
          const unassigned = posted.filter((row) => !row.fieldId);
          if (!unassigned.length) return [];
          const uIncome = sumType(unassigned, 'income');
          const uExpenses = sumType(unassigned, 'expense');
          return [
            {
              fieldId: null,
              fieldName: unassignedFieldLabel(language),
              isUnassigned: true,
              income: uIncome,
              expenses: uExpenses,
              netResult: roundMoney(uIncome - uExpenses),
              costPerHectare: null,
              incomePerHectare: null,
              netPerHectare: null,
              transactionCount: unassigned.length,
            },
          ];
        })(),
      ];

  const categoryRows = (type: 'income' | 'expense') => {
    const typed = posted.filter((row) => row.type === type && row.category);
    const total = typed.reduce((sum, row) => sum + row.amount, 0);
    const grouped = new Map<string, number>();
    typed.forEach((row) => {
      const key = row.category || 'other';
      grouped.set(key, (grouped.get(key) || 0) + row.amount);
    });
    return [...grouped.entries()]
      .map(([category, amount]) => ({
        category,
        categoryLabel: financialCategoryLabel(category, language),
        amount: roundMoney(amount),
        percentageOfTotal: total > 0 ? roundMoney((amount / total) * 100) : null,
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  return {
    year,
    currency: posted[0]?.currency || 'EUR',
    fieldId: fieldId || null,
    totalIncome: income,
    totalExpenses: expenses,
    netResult: net,
    resultLabel: resultLabel(net, hasPosted, language),
    transactionCount: posted.length,
    draftCount: drafts.length,
    lastPostedAt: posted
      .map((row) => row.postedAt || row.updatedAt)
      .sort()
      .at(-1),
    monthlyResults,
    fieldResults,
    incomeByCategory: categoryRows('income'),
    expenseByCategory: categoryRows('expense'),
    costPerHectare: null,
    incomePerHectare: null,
    netPerHectare: null,
    costPerKilogramOfOil: null,
    costPerKilogramMessage: hasPosted
      ? language.startsWith('en')
        ? 'There is not enough data for cost per kilogram.'
        : 'Δεν υπάρχουν αρκετά δεδομένα για κόστος ανά κιλό.'
      : null,
    dataAvailability: {
      hasPostedRecords: hasPosted,
      hasDraftRecords: drafts.length > 0,
      incomeIsUnknown: !hasPosted,
      expensesAreUnknown: !hasPosted,
      areaIsMissing: true,
      oilQuantityIsMissing: true,
      includesUnassigned: !fieldId && posted.some((row) => !row.fieldId),
    },
  };
}

export function overlayUnassignedSummary(
  summary: YearFinancialSummary,
  language: string
): YearFinancialSummary {
  const row = summary.fieldResults.find((item) => item.isUnassigned);
  const hasPosted = Boolean(row && row.transactionCount > 0);
  return {
    ...summary,
    fieldId: null,
    totalIncome: row?.income ?? null,
    totalExpenses: row?.expenses ?? null,
    netResult: row?.netResult ?? null,
    resultLabel: resultLabel(row?.netResult, hasPosted, language),
    transactionCount: row?.transactionCount ?? 0,
    monthlyResults: summary.monthlyResults.map((month) => ({
      ...month,
      income: null,
      expenses: null,
      netResult: null,
      hasRecords: false,
    })),
    fieldResults: [],
    incomeByCategory: [],
    expenseByCategory: [],
    dataAvailability: {
      ...summary.dataAvailability,
      hasPostedRecords: hasPosted,
      includesUnassigned: true,
    },
  };
}
