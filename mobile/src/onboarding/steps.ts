/** FieldOwner first-run activation — mirrored step ids for mobile. */

export const OWNER_ACTIVATION_STEPS = [
  'createGrove',
  'drawBoundary',
  'loadData',
  'firstObservation',
] as const;

/** Top checklist bar — spatial welcome + first observation are soft post-όρια guides. */
export const OWNER_CHECKLIST_STEPS = ['createGrove', 'drawBoundary', 'loadData'] as const;

export type OwnerActivationStepId = (typeof OWNER_ACTIVATION_STEPS)[number];

export type OwnerActivationPersisted = {
  skippedSteps: OwnerActivationStepId[];
  /** Permanent hide — only after όρια unlock (or Settings tips off). */
  dismissedAt: string | null;
  checklistCollapsed: boolean;
  forceShow: boolean;
  /** Later escape before όρια — allows browse until they resume or save boundary. */
  laterSnoozedAt: string | null;
  /** Soft guide after spatial welcome: details → first observation → chronologio. */
  awaitingFirstObservation: boolean;
  firstObservationDoneAt: string | null;
};

export const emptyPersisted = (): OwnerActivationPersisted => ({
  skippedSteps: [],
  dismissedAt: null,
  checklistCollapsed: false,
  forceShow: false,
  laterSnoozedAt: null,
  awaitingFirstObservation: false,
  firstObservationDoneAt: null,
});

export const storageKeyFor = (userId: string) => `oleachron.ownerActivation.v1.${userId}`;

export const ONBOARDING_TARGETS = {
  groveName: 'grove-name',
  createCta: 'grove-create-cta',
  boundaryMap: 'boundary-map',
  boundarySave: 'boundary-save',
  spatialPanel: 'spatial-loading',
  firstObservation: 'first-observation',
} as const;
