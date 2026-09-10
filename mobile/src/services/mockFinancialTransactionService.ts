import type {
  CreateFinancialTransactionInput,
  FinancialTransaction,
  FinancialTransactionList,
  FinancialTransactionStatus,
  FinancialTransactionType,
} from './financialTransactionService';
import {
  financialCategoryLabel,
  financialSourceLabel,
  financialStatusLabel,
  financialTypeLabel,
} from '../finance/display';

const rows: FinancialTransaction[] = [];

const monthOf = (iso: string) => {
  const match = /^(\d{4})-(\d{2})/.exec(iso);
  if (match) return Number(match[2]);
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 0 : d.getMonth() + 1;
};

const toDto = (input: CreateFinancialTransactionInput, id: string): FinancialTransaction => {
  const type = input.type;
  const status = input.saveAsDraft ? 'draft' : 'posted';
  const occurredOn = input.occurredOn || new Date().toISOString();
  const resultYear = input.resultYear || new Date(occurredOn).getFullYear();
  return {
    id,
    ownerUserId: 'mock-owner',
    type,
    typeLabel: financialTypeLabel(type),
    status,
    statusLabel: financialStatusLabel(status),
    amount: input.amount,
    currency: input.currency || 'EUR',
    occurredOn,
    resultYear,
    fieldId: input.fieldId || null,
    category: input.category,
    categoryLabel: input.category ? financialCategoryLabel(input.category) : undefined,
    description: input.description,
    paymentMethod: input.paymentMethod,
    counterpartyName: input.counterpartyName,
    relatedTaskId: input.relatedTaskId,
    relatedHarvestId: input.relatedHarvestId,
    relatedCollaboratorId: input.relatedCollaboratorId,
    sourceType: input.sourceType || 'manual',
    sourceTypeLabel: financialSourceLabel((input.sourceType as 'manual') || 'manual'),
    sourceId: input.sourceId,
    attachmentIds: input.attachmentIds || [],
    notes: input.notes,
    createdByUserId: 'mock-owner',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    postedAt: status === 'posted' ? new Date().toISOString() : undefined,
  };
};

export const listMockFinancialTransactions = () => rows;

export const mockFinancialTransactionService = {
  create: async (input: CreateFinancialTransactionInput): Promise<FinancialTransaction> => {
    if (input.idempotencyKey) {
      const existing = rows.find((r) => r.id.endsWith(input.idempotencyKey!));
      if (existing) return existing;
    }
    const created = toDto(input, `ft-${rows.length + 1}-${input.idempotencyKey || Date.now()}`);
    rows.unshift(created);
    return created;
  },

  getById: async (id: string): Promise<FinancialTransaction> => {
    const found = rows.find((r) => r.id === id);
    if (!found) throw new Error('Not found');
    return found;
  },

  list: async (params: {
    resultYear?: number;
    fieldId?: string;
    type?: FinancialTransactionType;
    status?: FinancialTransactionStatus;
    category?: string;
    month?: number;
    relatedTaskId?: string;
    relatedHarvestId?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<FinancialTransactionList> => {
    let items = [...rows];
    if (params.resultYear) items = items.filter((row) => row.resultYear === params.resultYear);
    if (params.fieldId) items = items.filter((row) => row.fieldId === params.fieldId);
    if (params.type) items = items.filter((row) => row.type === params.type);
    if (params.status) items = items.filter((row) => row.status === params.status);
    if (params.category) items = items.filter((row) => row.category === params.category);
    if (params.month) items = items.filter((row) => monthOf(row.occurredOn) === params.month);
    if (params.relatedTaskId) items = items.filter((row) => row.relatedTaskId === params.relatedTaskId);
    if (params.relatedHarvestId) {
      items = items.filter((row) => row.relatedHarvestId === params.relatedHarvestId);
    }
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 50;
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      totalCount: items.length,
      page,
      pageSize,
    };
  },

  void: async (id: string, reason: string): Promise<FinancialTransaction> => {
    const found = rows.find((r) => r.id === id);
    if (!found) throw new Error('Not found');
    found.status = 'void';
    found.statusLabel = financialStatusLabel('void');
    found.voidReason = reason;
    found.voidedAt = new Date().toISOString();
    return found;
  },

  deleteDraft: async (id: string): Promise<void> => {
    const index = rows.findIndex((r) => r.id === id);
    if (index >= 0) rows.splice(index, 1);
  },

  post: async (id: string): Promise<FinancialTransaction> => {
    const found = rows.find((r) => r.id === id);
    if (!found) throw new Error('Not found');
    found.status = 'posted';
    found.statusLabel = financialStatusLabel('posted');
    found.postedAt = new Date().toISOString();
    found.updatedAt = new Date().toISOString();
    return found;
  },

  update: async (
    id: string,
    input: Partial<CreateFinancialTransactionInput> & { clearField?: boolean }
  ): Promise<FinancialTransaction> => {
    const found = rows.find((r) => r.id === id);
    if (!found) throw new Error('Not found');
    if (input.amount != null) found.amount = input.amount;
    if (input.occurredOn) found.occurredOn = input.occurredOn;
    if (input.resultYear) found.resultYear = input.resultYear;
    if (input.clearField) found.fieldId = null;
    else if (input.fieldId !== undefined) found.fieldId = input.fieldId || null;
    if (input.category !== undefined) {
      found.category = input.category;
      found.categoryLabel = input.category ? financialCategoryLabel(input.category) : undefined;
    }
    if (input.description !== undefined) found.description = input.description;
    if (input.paymentMethod !== undefined) found.paymentMethod = input.paymentMethod;
    if (input.counterpartyName !== undefined) found.counterpartyName = input.counterpartyName;
    if (input.relatedTaskId !== undefined) found.relatedTaskId = input.relatedTaskId;
    if (input.relatedHarvestId !== undefined) found.relatedHarvestId = input.relatedHarvestId;
    if (input.notes !== undefined) found.notes = input.notes;
    if (input.attachmentIds) found.attachmentIds = input.attachmentIds;
    found.updatedAt = new Date().toISOString();
    return found;
  },
};
