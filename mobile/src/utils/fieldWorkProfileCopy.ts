import type { Field } from '../services/fieldService';
import type { FieldWorkProfile } from '../services/fieldWorkService';

export interface CopyProfileOptions {
  copyIrrigation: boolean;
  copyLastPerformed: boolean;
  copyAssignments: boolean;
}

export interface CopyDiffRow {
  key: string;
  /** i18n key under tasks:fieldWork.profile.copy.diff.* */
  labelKey: string;
  included: boolean;
  detailKey?: string;
}

/** Active fields other than the source. Drafts and archived fields stay out. */
export function selectableCopyTargets(fields: Field[], sourceFieldId: string): Field[] {
  return fields.filter((field) => {
    if (field.id === sourceFieldId) return false;
    const status = (field.status || '').toLowerCase();
    if (status === 'draft' || status === 'archived') return false;
    return (
      status === 'active' ||
      status === 'needsboundaryconfirmation' ||
      status === 'needsareareview'
    );
  });
}

export function buildCopyDiffPreview(
  profile: FieldWorkProfile | null | undefined,
  options: CopyProfileOptions
): CopyDiffRow[] {
  return [
    {
      key: 'purpose',
      labelKey: 'purpose',
      included: true,
      detailKey: profile?.productionPurpose,
    },
    {
      key: 'pruning',
      labelKey: 'pruning',
      included: true,
      detailKey: profile?.pruning?.preferenceMode,
    },
    {
      key: 'fertilisation',
      labelKey: 'fertilisation',
      included: true,
      detailKey: profile?.fertilisation?.preferenceMode,
    },
    {
      key: 'ground_cover',
      labelKey: 'groundCover',
      included: true,
      detailKey: profile?.groundCover?.preferenceMode,
    },
    {
      key: 'pest',
      labelKey: 'pest',
      included: true,
      detailKey: profile?.pestManagement?.preferenceMode,
    },
    {
      key: 'analysis',
      labelKey: 'analysis',
      included: true,
      detailKey: profile?.analysis?.preferenceMode,
    },
    {
      key: 'harvest',
      labelKey: 'harvest',
      included: true,
      detailKey: profile?.harvest?.preferenceMode,
    },
    {
      key: 'irrigation',
      labelKey: 'irrigation',
      included: options.copyIrrigation,
      detailKey: options.copyIrrigation ? profile?.irrigation?.preferenceMode : 'excluded',
    },
    {
      key: 'lastPerformed',
      labelKey: 'lastPerformed',
      included: options.copyLastPerformed,
      detailKey: options.copyLastPerformed ? 'included' : 'excluded',
    },
    {
      key: 'assignments',
      labelKey: 'assignments',
      included: options.copyAssignments,
      detailKey: options.copyAssignments ? 'included' : 'excluded',
    },
  ];
}
