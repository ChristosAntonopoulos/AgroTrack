import { Task, CreateTaskDto, Evidence } from '../taskService';
import { simulateDelay } from './mockData';
import { demoStore } from '../demo/demoStore';

export const mockTaskService = {
  getTasks: async (fieldId?: string, assignedTo?: string): Promise<Task[]> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    let filtered = [...demoStore.getTasks()];
    
    if (fieldId) {
      filtered = filtered.filter(t => t.fieldId === fieldId);
    }
    if (assignedTo) {
      filtered = filtered.filter(t => t.assignedTo === assignedTo);
    }
    
    return filtered;
  },

  getTask: async (id: string): Promise<Task> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    const task = demoStore.getTasks().find(t => t.id === id);
    if (!task) {
      throw new Error('Task not found');
    }
    return { ...task };
  },

  createTask: async (data: CreateTaskDto): Promise<Task> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    const newTask: Task = {
      id: `task${Date.now()}`,
      ...data,
      status: 'pending',
      evidence: [],
      approvalStatus: 'not_required',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    demoStore.setTasks([...demoStore.getTasks(), newTask]);

    demoStore.addEvent({
      type: 'task_status_changed',
      timestamp: newTask.createdAt,
      fieldId: newTask.fieldId,
      taskId: newTask.id,
      actorUserId: newTask.assignedTo,
      message: `Follow-up task created: ${newTask.title}`,
    });
    return { ...newTask };
  },

  updateTaskStatus: async (id: string, status: string): Promise<Task> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    
    const now = new Date().toISOString();
    const current = demoStore.getTasks().find((t) => t.id === id);
    if (!current) throw new Error('Task not found');

    const patch: Partial<Task> = { status, updatedAt: now };
    if (status === 'in_progress' && !current.actualStart) patch.actualStart = now;
    if (status === 'completed' && !current.actualEnd) {
      patch.actualEnd = now;
      // Completed tasks assigned to a producer should be reviewable by the owner.
      if (current.assignedTo) (patch as any).approvalStatus = 'pending';
    }

    const updated = demoStore.updateTask(id, patch as any);

    demoStore.addEvent({
      type: 'task_status_changed',
      timestamp: new Date().toISOString(),
      fieldId: updated.fieldId,
      taskId: updated.id,
      actorUserId: updated.assignedTo,
      message:
        status === 'in_progress'
          ? `Task started: ${updated.title}`
          : status === 'completed'
            ? `Task completed: ${updated.title}`
            : `Task updated: ${updated.title}`,
    });
    return { ...(updated as any) };
  },

  addEvidence: async (id: string, photoUrl?: string, notes?: string, kind?: Evidence['kind']): Promise<Task> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    const current = demoStore.getTasks().find((t) => t.id === id);
    if (!current) throw new Error('Task not found');
    
    const evidence: Evidence = {
      photoUrl,
      notes,
      timestamp: new Date().toISOString(),
      kind: kind || 'general',
    };
    
    const updated = demoStore.updateTask(id, {
      evidence: [...(current.evidence || []), evidence],
    } as any);

    demoStore.addEvent({
      type: 'evidence_added',
      timestamp: evidence.timestamp,
      fieldId: updated.fieldId,
      taskId: updated.id,
      actorUserId: updated.assignedTo,
      message: `Evidence added for: ${updated.title}`,
    });
    return { ...(updated as any) };
  },

  assignTask: async (id: string, assignedTo: string): Promise<Task> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    const updated = demoStore.updateTask(id, { assignedTo } as any);

    demoStore.addEvent({
      type: 'task_assigned',
      timestamp: new Date().toISOString(),
      fieldId: updated.fieldId,
      taskId: updated.id,
      actorUserId: 'user1',
      message: `Task assigned to ${assignedTo}: ${updated.title}`,
    });
    return { ...(updated as any) };
  },

  approveTask: async (id: string, note?: string): Promise<Task> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    const updated = demoStore.updateTask(id, { approvalStatus: 'approved', approvalNote: note } as any);

    demoStore.addEvent({
      type: 'task_approved',
      timestamp: new Date().toISOString(),
      fieldId: updated.fieldId,
      taskId: updated.id,
      actorUserId: 'user1',
      message: `Task approved: ${updated.title}`,
    });
    return { ...(updated as any) };
  },

  rejectTask: async (id: string, note?: string): Promise<Task> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    const updated = demoStore.updateTask(id, { approvalStatus: 'rejected', approvalNote: note } as any);

    demoStore.addEvent({
      type: 'task_rejected',
      timestamp: new Date().toISOString(),
      fieldId: updated.fieldId,
      taskId: updated.id,
      actorUserId: 'user1',
      message: `Task rejected: ${updated.title}`,
    });
    return { ...(updated as any) };
  },
};
