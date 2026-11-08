import type { Field } from '../services/fieldService';
import type {
  FieldIntelligenceSummary,
  FieldSpatialProfile,
  SpatialProcessingStatus,
} from '../services/geospatialService';
import {
  fieldHasBoundary,
  fieldHasLocation,
  isFieldSetupIncomplete,
} from '../utils/fieldDisplay';
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

/** Browse unlock: any owned grove has a map pin (boundary optional). */
export const ownerHasAnyLocation = (
  fields: Field[],
  userId: string | undefined | null
): boolean => fields.some((f) => isOwnedNamed(f, userId) && fieldHasLocation(f));

/** Any owned grove already has όρια — enrichment / satellite path. */
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

  const needsPin = owned.find((f) => !fieldHasLocation(f));
  if (needsPin) return needsPin;

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
  opts?: {
    firstObservationDone?: boolean;
    knownBoundaryFieldId?: string | null;
    knownLocationFieldId?: string | null;
    /** Draft grove just saved on the name step, before the fields list has refetched. */
    knownGroveFieldId?: string | null;
    userId?: string | null;
  }
): Record<OwnerActivationStepId, boolean> => {
  const hasGrove =
    Boolean(opts?.knownGroveFieldId) ||
    fields.some((f) => f.status !== 'Archived' && Boolean(f.name?.trim()));
  const hasLocation =
    ownerHasAnyLocation(fields, opts?.userId) ||
    Boolean(primary && fieldHasLocation(primary)) ||
    Boolean(
      opts?.knownLocationFieldId &&
        (!primary || primary.id === opts.knownLocationFieldId)
    );
  const hasBoundary =
    ownerHasAnyBoundary(fields, opts?.userId) ||
    Boolean(primary && fieldHasBoundary(primary)) ||
    Boolean(
      opts?.knownBoundaryFieldId &&
        (!primary || primary.id === opts.knownBoundaryFieldId)
    );

  return {
    createGrove: hasGrove,
    drawBoundary: hasLocation || hasBoundary,
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
