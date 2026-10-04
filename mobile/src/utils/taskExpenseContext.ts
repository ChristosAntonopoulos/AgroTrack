import type { CaptureContext } from '../capture/types';
import { templateMeta } from '../data/fieldWorkCatalogueLabels';
import type { FinancialCategory } from '../finance/display';

type TaskExpenseSource = {
  id: string;
  fieldId: string;
  title: string;
  templateCode?: string;
  plannedStart?: string;
  startedAt?: string;
};

const EXPENSE_BY_WORK: Record<string, FinancialCategory> = {
  fertilisation: 'fertilizers',
  irrigation: 'irrigation',
  monitoring: 'plant_protection',
  pruning: 'labor',
  harvest: 'labor',
  ground: 'labor',
  inspection: 'labor',
};

export const taskExpenseCaptureContext = (task: TaskExpenseSource): CaptureContext => {
  const work = templateMeta(task.templateCode)?.category;
  const category = work ? EXPENSE_BY_WORK[work] : undefined;
  const title = task.title.trim();
  return {
    preferredType: 'expense',
    fieldId: task.fieldId,
    taskId: task.id,
    occurredAt: task.startedAt || task.plannedStart,
    description: title || undefined,
    category,
  };
};
