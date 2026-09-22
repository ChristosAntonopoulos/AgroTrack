import type { FinancialTransaction } from '../services/financialTransactionService';
import { friendlyFieldLabel } from '../utils/fieldLabels';

const cell = (value: string | number | null | undefined): string => {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export function moneyLedgerCsv(input: {
  rows: FinancialTransaction[];
  fieldNames: Record<string, string>;
  unassignedLabel: string;
}): string {
  const headers = [
    'date',
    'harvestYear',
    'type',
    'category',
    'description',
    'amount',
    'currency',
    'field',
    'status',
    'source',
    'notes',
  ];
  const lines = input.rows.map((row) => {
    const field = row.fieldId
      ? friendlyFieldLabel(input.fieldNames[row.fieldId] || row.fieldId)
      : input.unassignedLabel;
    return [
      row.occurredOn.slice(0, 10),
      row.resultYear,
      row.typeLabel || row.type,
      row.categoryLabel || row.category || '',
      row.description,
      row.amount.toFixed(2),
      row.currency,
      field,
      row.statusLabel || row.status,
      row.sourceTypeLabel || row.sourceType,
      row.notes || '',
    ]
      .map(cell)
      .join(',');
  });
  return [headers.join(','), ...lines].join('\n');
}

export function downloadTextFile(filename: string, contents: string, mime = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([`\uFEFF${contents}`], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
