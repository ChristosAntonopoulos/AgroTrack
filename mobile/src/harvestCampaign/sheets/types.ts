import type { Field } from '../../services/fieldService';
import type { HarvestCampaign, HarvestCaptureKind } from '../types';

export type HarvestSheetSharedProps = {
  campaign: HarvestCampaign;
  fields: Field[];
  today: string;
  locale: string;
  onClose: () => void;
  /** Prefill single-field pickers (Capture / deep link). */
  preferredFieldId?: string;
};

/** Shared chrome when σάκοι / ελαιόκαρπος / λάδι are one form. */
export type HarvestFlowChrome = {
  nextLabel: string;
  backLabel?: string;
  onBack?: () => void;
  busy?: boolean;
  active?: boolean;
  bind?: (saveIfReady: () => boolean) => void;
};

export type HarvestSheetKind =
  | HarvestCaptureKind
  | 'add'
  | 'produce'
  | 'mill-link'
  | 'mill-next'
  | 'complete'
  | null;
