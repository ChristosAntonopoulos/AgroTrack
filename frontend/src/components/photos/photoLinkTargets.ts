import { getFieldWorkService, getHarvestService, getNoteService } from '../../services/serviceFactory';
import type { FieldPhenologyObservation } from '../../services/fieldWorkService';
import { notePreviewTitle } from '../../services/noteService';
import { localizeLinkedStatus } from './photoLabels';

import type { TFunction } from 'i18next';

export type PhotoLinkTarget = { id: string; label: string };

type LoadArgs = {
  fieldId: string;
  ownerType: string;
  formatDate: (value: string) => string;
  t: TFunction;
};

/** Loads linkable records for a field — shared by detail drawer and bulk bar. */
export const loadPhotoLinkTargets = async ({
  fieldId,
  ownerType,
  formatDate,
  t,
}: LoadArgs): Promise<PhotoLinkTarget[]> => {
  const fieldWork = getFieldWorkService();
  if (ownerType === 'task') {
    const tasks = await fieldWork.listFieldTasks({ fieldId });
    return tasks.map((task) => {
      const when = task.plannedStart ? formatDate(task.plannedStart) : '';
      const status = localizeLinkedStatus(task.status, t) || '';
      return {
        id: task.id,
        label: [when, task.title, status].filter(Boolean).join(' · '),
      };
    });
  }
  if (ownerType === 'note') {
    const notes = await getNoteService().getNotes({ fieldId, limit: 40 });
    return notes.map((note) => ({
      id: note.id,
      label: notePreviewTitle(note.body) || note.id,
    }));
  }
  if (ownerType === 'harvest') {
    const harvests = await getHarvestService().listByField(fieldId);
    return harvests.map((h) => ({
      id: h.id,
      label: `${formatDate(h.harvestDate)} · ${h.oliveKg} kg`,
    }));
  }
  if (ownerType === 'phenology') {
    const observations: FieldPhenologyObservation[] =
      await fieldWork.listPhenologyObservations(fieldId);
    return observations.map((o) => ({
      id: o.id,
      label: `${o.stageLabel || o.stageCode} · ${formatDate(o.observedOn)}`,
    }));
  }
  return [];
};
