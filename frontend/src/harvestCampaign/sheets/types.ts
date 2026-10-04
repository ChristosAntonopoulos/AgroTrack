import type { Field } from '../../services/fieldService';
import type { HarvestCampaign } from '../types';

export type HarvestSheetSharedProps = {
  campaign: HarvestCampaign;
  fields: Field[];
  today: string;
  locale: string;
  onClose: () => void;
};

/** Shared chrome when σάκοι / ελαιόκαρπος / λάδι are one form. */
export type HarvestFlowChrome = {
  nextLabel: string;
  backLabel?: string;
  onBack?: () => void;
  busy?: boolean;
  active?: boolean;
  /** Latest save-if-valid gate, so the step tabs can move forward. */
  bind?: (saveIfReady: () => boolean) => void;
};

export type HarvestSheetKind =
  | import('../types').HarvestCaptureKind
  | 'add'
  | 'produce'
  | 'mill-link'
  | 'mill-next'
  | 'evening'
  | 'complete'
  | null;
