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

export type HarvestSheetKind =
  | HarvestCaptureKind
  | 'add'
  | 'mill-link'
  | 'mill-next'
  | 'evening'
  | 'complete'
  | null;
