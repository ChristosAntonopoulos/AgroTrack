import type { FieldTask, FieldTaskChecklistItem } from '../services/fieldWorkService';
import type { Task, TaskChecklistItem } from '../services/taskService';

const mapChecklist = (items: TaskChecklistItem[] | undefined): FieldTaskChecklistItem[] =>
  (items || []).map((item) => ({
    key: item.key,
    label: item.label,
    greekLabel: item.greekLabel || item.label,
    englishLabel: item.englishLabel || item.label,
    itemType: item.itemType || 'text',
    requirement: item.requirement || 'optional',
    isEssential: Boolean(item.isEssential),
    sortOrder: item.sortOrder ?? 0,
    isAnswered: Boolean(item.isAnswered),
    textValue: item.textValue,
    numberValue: item.numberValue,
    boolValue: item.boolValue,
    attachmentIds: item.attachmentIds || [],
    choices: item.choices || [],
    unit: item.unit,
  }));

/** Bridge new Task DTOs into legacy FieldTask-shaped consumers (counts, brief, pickers). */
export const taskToFieldTask = (task: Task): FieldTask => ({
  id: task.id,
  fieldId: task.fieldId,
  resultYear: task.resultYear,
  templateCode: task.templateCode,
  title: task.title,
  description: task.description,
  status: task.status,
  statusLabel: task.statusLabel || String(task.status),
  plannedStart: task.plannedStart || task.scheduledFor,
  plannedEnd: task.plannedEnd,
  assignedUserId: task.assignedUserId || task.assigneeId,
  assignedCollaboratorId: task.assignedCollaboratorId,
  additionalParticipantUserIds: [],
  assignmentResponse: '',
  checklist: mapChecklist(task.checklist),
  notes: task.notes || task.note,
  attachmentIds: [],
  weatherSuitability: 'unknown',
  weatherSuitabilityLabel: '',
  createdByUserId: task.createdByUserId || '',
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});
