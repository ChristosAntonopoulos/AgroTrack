import type { Field } from '../services/fieldService';
import type {
  FieldIntelligenceSummary,
  FieldSpatialProfile,
  SpatialProcessingStatus,
} from '../services/geospatialService';
import { fieldHasBoundary, isFieldSetupIncomplete } from '../utils/fieldDisplay';
import { OWNER_ACTIVATION_STEPS, type OwnerActivationStepId } from './steps';

export type SpatialReadiness = 'idle' | 'waiting' | 'ready' | 'failed';

/** Only current + completed steps — blocks jumping ahead into Chronologio/tasks mid-setup. */
export const canVisitActivationStep = (
  step: OwnerActivationStepId,
  completion: Record<OwnerActivationStepId, boolean>
): boolean => {
  if (completion[step]) return true;
  for (const s of OWNER_ACTIVATION_STEPS) {
    if (!completion[s]) return s === step;
  }
  return true;
};

const isOwnerRole = (role?: string | null): boolean =>
  !role || role === 'FieldOwner' || role === '';

export const isActivationOwnerRole = isOwnerRole;

const isOwnedNamed = (f: Field, userId: string | undefined | null): boolean => {
  if (f.status === 'Archived') return false;
  if (!f.name?.trim()) return false;
  if (userId && f.ownerId && f.ownerId !== userId) return false;
  return true;
};

/** Browse unlock: any owned grove already has όρια. */
export const ownerHasAnyBoundary = (
  fields: Field[],
  userId: string | undefined | null
): boolean => fields.some((f) => isOwnedNamed(f, userId) && fieldHasBoundary(f));

export const pickActivationField = (
  fields: Field[],
  userId: string | undefined | null
): Field | null => {
  const owned = fields.filter((f) => isOwnedNamed(f, userId));
  if (owned.length === 0) return null;

  const needsBoundary = owned.find((f) => !fieldHasBoundary(f));
  if (needsBoundary) return needsBoundary;

  const active = owned.find((f) => f.status === 'Active');
  if (active) return active;

  const incomplete = owned.find((f) => isFieldSetupIncomplete(f.status));
  return incomplete || owned[0];
};

export const evaluateStepCompletion = (
  fields: Field[],
  primary: Field | null,
  spatial: SpatialReadiness,
  opts?: { firstObservationDone?: boolean }
): Record<OwnerActivationStepId, boolean> => {
  const hasGrove = fields.some((f) => f.status !== 'Archived' && Boolean(f.name?.trim()));
  const hasBoundary = primary ? fieldHasBoundary(primary) : false;

  return {
    createGrove: hasGrove,
    drawBoundary: hasBoundary,
    loadData: hasBoundary && spatial === 'ready',
    firstObservation: Boolean(opts?.firstObservationDone),
  };
};

export const spatialStatusFromProfiles = (
  profile: FieldSpatialProfile | null | undefined,
  summary: FieldIntelligenceSummary | null | undefined
): SpatialReadiness => {
  const status: SpatialProcessingStatus | undefined =
    profile?.processingStatus ?? summary?.processingStatus;

  if (status === 'failed') return 'failed';

  const hasLand = Boolean(
    profile?.terrain || summary?.terrain || profile?.soil || summary?.soil || profile?.geometry
  );

  if (status === 'pending' || status === 'processing') return 'waiting';
  if (status === 'completed' || status === 'partial' || hasLand) return 'ready';
  if (!status && !hasLand) return 'waiting';
  return 'idle';
};

export const shouldRunOwnerActivation = (
  role: string | undefined | null,
  fields: Field[],
  userId: string | undefined | null
): boolean => {
  if (!isOwnerRole(role)) return false;
  if (userId && fields.length > 0) {
    const owns = fields.some((f) => !f.ownerId || f.ownerId === userId);
    if (!owns) return false;
  }
  return true;
};
