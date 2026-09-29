import type { InboxItem } from '../../services/inAppCampaignService';
import { demoStore } from '../../services/demo/demoStore';
import { notificationCategory } from './notificationVisibility';

/**
 * Demo accounts need assignment and approval rows even when the API inbox is empty,
 * so the drawer shows the same event kinds the settings describe.
 */
export function buildDemoInbox(userId: string): InboxItem[] {
  if (!userId) return [];
  const tasks = demoStore.getTasks();
  const events = demoStore.getEvents();
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const involves = (taskId?: string) => {
    if (!taskId) return false;
    const task = taskById.get(taskId);
    if (!task) return false;
    return task.assignedUserId === userId || task.createdByUserId === userId;
  };

  const items: InboxItem[] = [];
  const assignment = [...events]
    .reverse()
    .find((event) => event.type === 'task_assigned' && (event.actorUserId === userId || involves(event.taskId)));
  if (assignment) {
    items.push({
      id: `demo-assign-${assignment.taskId || assignment.id}`,
      source: 'transactional',
      type: 'task_assigned',
      title: assignment.message,
      message: assignment.message,
      actionUrl: assignment.taskId ? `/tasks/${assignment.taskId}` : '/tasks',
      isRead: false,
      isCompleted: false,
      createdAt: assignment.timestamp,
    });
  }

  const pending = tasks.find(
    (task) =>
      task.approvalStatus === 'pending' &&
      (task.assignedUserId === userId || task.createdByUserId === userId)
  );
  if (pending) {
    items.push({
      id: `demo-approval-${pending.id}`,
      source: 'transactional',
      type: 'task_approval',
      title: pending.title,
      message: pending.approvalNote || pending.title,
      actionUrl: `/tasks/${pending.id}`,
      // Pending approvals stay unread so the badge matches the drawer.
      isRead: false,
      isCompleted: false,
      createdAt: pending.updatedAt || pending.createdAt,
    });
  } else {
    const decision = [...events]
      .reverse()
      .find(
        (event) =>
          (event.type === 'task_approved' || event.type === 'task_rejected') &&
          (event.actorUserId === userId || involves(event.taskId))
      );
    if (decision) {
      items.push({
        id: `demo-approval-${decision.taskId || decision.id}`,
        source: 'transactional',
        type: decision.type === 'task_rejected' ? 'task_rejected' : 'task_approved',
        title: decision.message,
        message: decision.message,
        actionUrl: decision.taskId ? `/tasks/${decision.taskId}` : '/tasks',
        isRead: true,
        isCompleted: true,
        createdAt: decision.timestamp,
      });
    }
  }

  return ensureAssignmentAndApprovalSamples(items, userId);
}

/** Guarantee both settings categories appear for any signed-in demo user. */
function ensureAssignmentAndApprovalSamples(items: InboxItem[], userId: string): InboxItem[] {
  const next = [...items];
  const has = (category: ReturnType<typeof notificationCategory>) =>
    next.some((item) => notificationCategory({ type: item.type, source: item.source }) === category);

  if (!has('taskAssignment')) {
    next.push({
      id: `demo-assign-fallback-${userId}`,
      source: 'transactional',
      type: 'task_assigned',
      title: 'Νέα ανάθεση εργασίας',
      message: 'Σας ανατέθηκε εργασία στον ελαιώνα. Ανοίξτε τις εργασίες για λεπτομέρειες.',
      actionUrl: '/tasks',
      isRead: false,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    });
  }

  if (!has('approval')) {
    next.push({
      id: `demo-approval-fallback-${userId}`,
      source: 'transactional',
      type: 'task_approval',
      title: 'Αναμονή έγκρισης',
      message: 'Μια ολοκληρωμένη εργασία περιμένει έγκριση.',
      actionUrl: '/tasks',
      isRead: false,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    });
  }

  return next;
}

export function mergeDemoInbox(apiItems: InboxItem[], userId: string | undefined, mockMode: boolean): InboxItem[] {
  if (!mockMode || !userId) return apiItems;
  const extras = buildDemoInbox(userId).filter((demo) => {
    const category = notificationCategory({ type: demo.type, source: demo.source });
    return !apiItems.some(
      (item) => notificationCategory({ type: item.type, source: item.source }) === category
    );
  });
  return [...apiItems, ...extras];
}
